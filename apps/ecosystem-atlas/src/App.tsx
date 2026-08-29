import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
/* eslint-disable @next/next/no-html-link-for-pages -- this package is an independent Vite SPA, not a Next.js app */
import { ProductBrand } from "../../../packages/design-system/src/ProductBrand";
import {
  actorTypes,
  agents,
  authorityLabels,
  clientProducts,
  dataFamilies,
  dataSources,
  directnessLabels,
  glossaryScopeLabels,
  glossaryTerms,
  priorityLabels,
  realAgentImplementations,
  realAgentLessons,
  realAgentReusablePatterns,
  tenderDatasets,
  tenderSides,
} from "../../../packages/catalog-data/src";
import { case1ProcessGraph } from "../../../app/case-simulation/case-1-graph";
import type {
  ActorType,
  DatasetDemo,
  GlossaryScope,
  RealAgentImplementation,
  RealAgentLesson,
  RealAgentReusablePattern,
  TenderDataset,
} from "../../../packages/catalog-schema/src";
import { AgentSpecificationsPage } from "./AgentSpecifications";

const mainAppUrl = "https://tenderlab-ai-agents.web.app";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/agents", label: "Agent Specifications" },
  { href: "/real-agents", label: "Real Agents" },
  { href: "/orchestration", label: "Process Operations" },
  { href: "/actors", label: "Sides & Actors" },
  { href: "/data", label: "Data & Sources" },
  { href: "/glossary", label: "Glossary" },
  { href: "/methodology", label: "Methodology" },
];

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

function AtlasHeader({ path }: { path: string }) {
  return (
    <header className="atlas-header">
      <a className="atlas-brand" href="/" aria-label="Tender Ecosystem Atlas home"><ProductBrand atlas /></a>
      <nav className="atlas-nav" aria-label="Atlas navigation">
        {navItems.map((item) => (
          <a aria-current={path === item.href || (item.href !== "/" && path.startsWith(`${item.href}/`)) ? "page" : undefined} href={item.href} key={item.href}>{item.label}</a>
        ))}
      </nav>
      <a className="open-tenderlab" href={mainAppUrl}>Open TenderLab.ai <span>↗</span></a>
    </header>
  );
}

function AtlasFooter() {
  return (
    <footer className="atlas-footer">
      <ProductBrand atlas />
      <p>Independent catalogues. Validated connections only.</p>
      <span>CATALOGUE VERSION · 1.0.0-DRAFT</span>
    </footer>
  );
}

function PageIntro({ kicker, title, accent, text, aside }: { kicker: string; title: string; accent?: string; text: string; aside?: ReactNode }) {
  return (
    <section className="page-intro">
      <div>
        <p className="kicker"><i />{kicker}</p>
        <h1>{title}{accent && <><br /><em>{accent}</em></>}</h1>
        <span>{text}</span>
      </div>
      {aside && <aside>{aside}</aside>}
    </section>
  );
}

function StatusTag() {
  return <span className="status-tag"><i /> DRAFT · UNDER VALIDATION</span>;
}

function OverviewPage() {
  const proprietary = tenderDatasets.filter((item) => item.familyId.endsWith("D16")).length;
  const stats = [
    [String(tenderSides.length).padStart(2, "0"), "Canonical Sides", "Institutional groups"],
    [String(actorTypes.length).padStart(2, "0"), "Actor Types", "Direct, indirect, contextual"],
    [String(dataFamilies.length).padStart(2, "0"), "Data Families", "Lifecycle-wide taxonomy"],
    [String(tenderDatasets.length).padStart(2, "0"), "Datasets", `${proprietary} proprietary assets`],
    [String(dataSources.length).padStart(2, "0"), "Source Systems", "Representative providers"],
    [String(glossaryTerms.length).padStart(2, "0"), "Glossary Terms", "One canonical language"],
    [String(case1ProcessGraph.processes.length).padStart(2, "0"), "Case Processes", "Admin model · not runtime"],
  ];

  return (
    <>
      <PageIntro
        kicker="TENDER ECOSYSTEM · REFERENCE SYSTEM"
        title="Map the environment."
        accent="Keep the operating system focused."
        text="Tender Ecosystem Atlas — admin-facing reference and control surface: участники, данные, Agent specifications и orchestration governance вокруг TenderLab.ai. Каталоги развиваются независимо и связываются стабильными IDs."
        aside={<><StatusTag /><strong>Boundary</strong><p><b>Atlas</b> объясняет и контролирует architecture.<br /><b>TenderLab.ai runtime</b> должен исполнять workflows.</p></>}
      />

      <section className="atlas-stats" aria-label="Catalogue metrics">
        {stats.map(([value, label, note]) => <article key={label}><strong>{value}</strong><span>{label}</span><small>{note}</small></article>)}
      </section>

      <section className="boundary-section">
        <div className="section-title"><p>ONE FAMILY · TWO SURFACES</p><h2>Чёткая информационная граница</h2></div>
        <div className="boundary-grid">
          <article className="boundary-main">
            <span>OPERATIONAL / INTELLIGENCE</span>
            <h3>TenderLab.ai</h3>
            <p>Agents, orchestration, architecture, cases, simulation и validation.</p>
            <a href={mainAppUrl}>Open main application ↗</a>
          </article>
          <div className="boundary-divider"><span>≠</span><small>separate purpose<br />shared language</small></div>
          <article className="boundary-atlas">
            <span>ECOSYSTEM / REFERENCE</span>
            <h3>Tender Ecosystem Atlas</h3>
            <p>Sides, Actor Types, Datasets, Sources, Agent/Process specifications, readiness и methodology для admins.</p>
            <a href="/actors">Explore Atlas →</a>
          </article>
        </div>
      </section>

      <section className="catalogue-entry-grid">
        <a href="/actors" className="catalogue-entry actors-entry">
          <div><span>CATALOGUE 01</span><b>{tenderSides.length} SIDES · {actorTypes.length} ACTOR TYPES</b></div>
          <h2>Sides & Actors</h2>
          <p>Кто формирует спрос, конкурирует, исполняет, финансирует, контролирует, получает результат и поддерживает рынок.</p>
          <footer><span>Side → Actor Type → specific Actor</span><i>→</i></footer>
        </a>
        <a href="/data" className="catalogue-entry data-entry">
          <div><span>CATALOGUE 02</span><b>{dataFamilies.length} FAMILIES · {tenderDatasets.length} DATASETS</b></div>
          <h2>Data & Sources</h2>
          <p>Какие project, tender, company, contract, market и proprietary datasets существуют и на каких условиях доступны.</p>
          <footer><span>Dataset ≠ provider ≠ portal</span><i>→</i></footer>
        </a>
        <a href="/orchestration" className="catalogue-entry process-entry">
          <div><span>CONTROL SURFACE</span><b>{case1ProcessGraph.processes.length} CASE PROCESSES · {case1ProcessGraph.processAgentExecutions.length} AGENT EXECUTIONS</b></div>
          <h2>Process Operations</h2>
          <p>Какие Processes существуют, кто их выполняет, какие Artifacts они создают и чего ещё не хватает до production runtime.</p>
          <footer><span>Definition → Instance → Execution → Artifact</span><i>→</i></footer>
        </a>
        <a href="/real-agents" className="catalogue-entry real-agent-entry">
          <div><span>KNOWLEDGE BRIDGE</span><b>{realAgentImplementations.length} IMPLEMENTATIONS · {realAgentReusablePatterns.length} VALIDATED PATTERNS</b></div>
          <h2>Real Agent Development</h2>
          <p>Как approved Agent concept проходит через real evidence, experiment, audit и production verification — и возвращает проверенные lessons в следующий Agent.</p>
          <footer><span>Strategy → Method → Implementation → Learning</span><i>→</i></footer>
        </a>
      </section>

      <section className="deferred-banner">
        <span>RELATIONSHIPS · INTENTIONALLY DEFERRED</span>
        <strong>Agents ↔ Actors ↔ Data пока не моделируются.</strong>
        <p>Сначала каждый каталог должен стать достаточно зрелым и внутренне согласованным. Отдельный relationship layer появится после validation.</p>
      </section>
    </>
  );
}

const processKindLabels = { persistent: "Persistent", "case-scoped": "Case-scoped", parallel: "Parallel" } as const;
const runtimeCapabilities = [
  ["01", "Process Definition Registry", "MODELED", "Versioned reusable definition: kind, owner role, trigger, inputs, outputs, SLA and stop rule."],
  ["02", "Process Instance / Run", "PARTIAL", "Case-scoped identity and current state exist in the model; durable runtime lifecycle does not."],
  ["03", "Scheduler + Trigger Engine", "REQUIRED", "Starts persistent, scheduled, event-driven and parallel Processes without browser activity."],
  ["04", "Persistent State Store", "REQUIRED", "Stores state, checkpoints, leases, timestamps, freshness, version and recovery position."],
  ["05", "Dependency Resolver", "MODELED", "Typed Event ↔ Process edges exist; runtime blocking, fan-in and resume evaluation remain to implement."],
  ["06", "Agent Execution Journal", "REQUIRED", "Records every attempt, input snapshot, model/tool version, status, retry and idempotency key."],
  ["07", "Artifact Repository", "PARTIAL", "Artifact ownership and consumers are modeled; durable content, schema, ACL and retention are not."],
  ["08", "Human Decision / Approval Service", "MODELED", "Gates exist in architecture; assignment, notification, expiry and signed decision records need runtime."],
  ["09", "Observability + Recovery", "REQUIRED", "Admin health, latency, failures, retries, dead-letter queue, pause/resume and replay controls."],
  ["10", "Security + Governance", "REQUIRED", "RBAC, secrets, data classification, audit retention and separation between admins, clients and backend."],
] as const;

function ProcessOperationsPage() {
  const artifactById = new Map(case1ProcessGraph.artifacts.map((artifact) => [artifact.id, artifact]));
  const actorById = new Map(case1ProcessGraph.actors.map((actor) => [actor.id, actor]));
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  return <>
    <PageIntro kicker="ADMIN CONTROL PLANE · ORCHESTRATION" title="Processes are modeled." accent="Runtime is the next layer." text="Эта страница показывает admins канонические Process instances Case 1, их Agent executions, owned Artifacts и честный production-readiness gap. Atlas не изображает scheduler работающим, пока backend runtime отсутствует." aside={<><StatusTag /><strong>{case1ProcessGraph.processes.length} Process instances</strong><p>{case1ProcessGraph.processAgentExecutions.length} Agent executions · {case1ProcessGraph.artifacts.filter((item) => item.producerKind === "process").length} Process-owned Artifacts.</p></>} />

    <section className="process-model-chain" aria-label="Canonical Process runtime model">
      {[['01','Case','Business context + scope'],['02','Event / Process','Bounded occurrence or continuing work'],['03','Agent Execution','One capability run inside its owner node'],['04','Artifact','Versioned output owned by Event or Process'],['05','Next node','Typed dependency + handoff']].map(([number,title,note], index) => <article key={title}><span>{number}</span><strong>{title}</strong><small>{note}</small>{index < 4 && <i>→</i>}</article>)}
    </section>

    <section className="process-definition-note">
      <div><span>PRODUCTION IDENTITY BOUNDARY</span><h2>Definition ≠ Instance ≠ Execution attempt</h2></div>
      <p><b>Process Definition</b> — reusable, versioned algorithm. <b>Process Instance</b> — его работа внутри конкретного Case. <b>Agent Execution</b> — отдельный запуск Agent с input snapshot. <b>Artifact</b> — сохранённый результат этого запуска или Process.</p>
    </section>

    <div className="section-title"><p>CASE 1 · CURRENT ADMIN REGISTRY</p><h2>First-class Process instances</h2></div>
    <section className="process-registry-grid">
      {case1ProcessGraph.processes.map((process) => {
        const owner = actorById.get(process.ownerActorId);
        const processAgents = process.agentIds.map((id) => agentById.get(id)).filter(Boolean);
        return <article key={process.id} className={`process-registry-card process-kind-${process.kind}`}>
          <header><b>{process.id}</b><span>{processKindLabels[process.kind]}</span><i>{process.state}</i></header>
          <h2>{process.name}</h2><p>{process.purpose}</p>
          <dl><div><dt>OWNER ACTOR</dt><dd>{owner?.name ?? process.ownerActorId}</dd></div><div><dt>TRIGGER</dt><dd>{process.trigger}</dd></div><div><dt>TIMING</dt><dd>{process.timing}</dd></div></dl>
          <section><span>AGENT EXECUTIONS</span><div>{processAgents.map((agent) => <a href={`/agents/${agent!.slug}`} key={agent!.id}>{String(agent!.id).padStart(2, "0")} · {agent!.name}</a>)}</div></section>
          <section><span>OWNED ARTIFACTS</span><div>{process.outputArtifactIds.map((id) => <em key={id}>{artifactById.get(id)?.name ?? id}</em>)}</div></section>
          <footer><span>CONSUMED BY</span><b>{process.consumerRefs.join(" · ")}</b></footer>
        </article>;
      })}
    </section>

    <div className="section-title"><p>PRODUCTIONIZATION · ADMIN CHECKLIST</p><h2>What makes Process operational?</h2></div>
    <section className="runtime-readiness-table">
      <header><span>CAPABILITY</span><span>CURRENT STATE</span><span>WHAT MUST EXIST</span></header>
      {runtimeCapabilities.map(([number, capability, status, requirement]) => <article key={number}><b>{number} · {capability}</b><i className={`runtime-status runtime-status-${status.toLowerCase()}`}>{status}</i><p>{requirement}</p></article>)}
    </section>

    <section className="process-admin-boundary"><span>ADMIN FRONT ≠ EXECUTION BACKEND</span><strong>Tender Ecosystem controls definitions, evidence, readiness and exceptions.</strong><p>Production runtime исполняет schedule/trigger, сохраняет state and Artifacts, запускает Agents, применяет dependencies и возвращает telemetry в этот admin front.</p></section>
  </>;
}

function ActorDrawer({ actor, onClose }: { actor: ActorType; onClose: () => void }) {
  const sides = actor.sideIds.map((id) => tenderSides.find((side) => side.id === id)!).filter(Boolean);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="atlas-drawer" role="dialog" aria-modal="true" aria-labelledby="actor-drawer-title">
        <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        <p className="drawer-code">{actor.id} · {actor.status}</p>
        <h2 id="actor-drawer-title">{actor.name.en}</h2>
        <p className="drawer-ru">{actor.name.ru}</p>
        <div className="drawer-badges">
          {sides.map((side) => <span style={{ "--item-color": side.color } as CSSProperties} key={side.id}>{side.name.en}</span>)}
          <span>{directnessLabels[actor.directness]}</span><span>{actor.authority}</span>
        </div>
        <section><span>INSTITUTIONAL PURPOSE</span><strong>{actor.summary}</strong><p>{actor.role}</p></section>
        <div className="actor-detail-grid">
          <section><span>REPRESENTS</span><p>{actor.represents}</p></section>
          <section><span>CONTRACTUAL POSITION</span><p>{actor.contractualPosition}</p></section>
          <section><span>DECISION AUTHORITY</span><p><b>{actor.authority}</b> · {authorityLabels[actor.authority]}</p></section>
          <section><span>ACTIVE STAGES</span><div className="chip-list">{actor.stages.map((item) => <i key={item}>{item}</i>)}</div></section>
        </div>
        <div className="io-panel">
          <section><span>TYPICAL INPUTS</span>{actor.typicalInputs.map((item) => <p key={item}>← {item}</p>)}</section>
          <section><span>TYPICAL OUTPUTS</span>{actor.typicalOutputs.map((item) => <p key={item}>→ {item}</p>)}</section>
        </div>
        {actor.participationNote && <div className="context-note"><span>CONTEXT-DEPENDENT</span><p>{actor.participationNote}</p></div>}
        <footer>Institutional Actor Type · not a specific organization</footer>
      </aside>
    </div>
  );
}

function ActorsPage() {
  const [query, setQuery] = useState("");
  const [sideId, setSideId] = useState("all");
  const [directness, setDirectness] = useState("all");
  const [selected, setSelected] = useState<ActorType | null>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return actorTypes.filter((item) => {
      const sideMatch = sideId === "all" || item.sideIds.includes(sideId);
      const directMatch = directness === "all" || item.directness === directness;
      const haystack = [item.name.en, item.name.ru, item.summary, item.role, item.represents, ...item.aliases].join(" ").toLocaleLowerCase("ru");
      return sideMatch && directMatch && (!normalized || haystack.includes(normalized));
    });
  }, [directness, query, sideId]);

  return (
    <>
      <PageIntro kicker="CATALOGUE 01 · SIDES / ACTORS" title="Who participates" accent="in the Tender Ecosystem?" text="Side — устойчивая institutional grouping. Actor Type — канонический тип участника. Конкретная организация появляется только внутри отдельного Case." aside={<><StatusTag /><strong>{tenderSides.length} Sides</strong><p>{actorTypes.length} Actor Types · multi-role classification supported.</p></>} />

      <section className="side-taxonomy" aria-label="Tender side taxonomy">
        {tenderSides.map((side) => (
          <button className={sideId === side.id ? "active" : ""} key={side.id} onClick={() => setSideId(sideId === side.id ? "all" : side.id)} style={{ "--item-color": side.color } as CSSProperties}>
            <span>{side.code}</span><strong>{side.name.en}</strong><small>{side.actorTypeIds.length} actor types</small>
          </button>
        ))}
      </section>

      <section className="catalogue-controls">
        <label className="catalogue-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти Actor Type по роли или назначению" /></label>
        <div className="segmented" role="group" aria-label="Directness filter">
          {["all", "direct", "indirect", "context-dependent"].map((item) => <button className={directness === item ? "active" : ""} onClick={() => setDirectness(item)} key={item}>{item === "all" ? "All participation" : directnessLabels[item as ActorType["directness"]]}</button>)}
        </div>
        <span className="result-count">{filtered.length} / {actorTypes.length}</span>
      </section>

      <section className="actor-grid">
        {filtered.map((item) => {
          const primarySide = tenderSides.find((side) => side.id === item.sideIds[0])!;
          return (
            <button className="actor-card" onClick={() => setSelected(item)} key={item.id} style={{ "--item-color": primarySide.color } as CSSProperties}>
              <div><span>{item.id.split("-").slice(-1)}</span><b>{item.authority}</b></div>
              <h2>{item.name.en}</h2><p>{item.name.ru}</p><small>{item.summary}</small>
              <footer><span>{directnessLabels[item.directness]}</span><i>Open profile →</i></footer>
            </button>
          );
        })}
      </section>
      {filtered.length === 0 && <div className="empty-state"><strong>Ничего не найдено</strong><button onClick={() => { setQuery(""); setSideId("all"); setDirectness("all"); }}>Сбросить фильтры</button></div>}
      {selected && <ActorDrawer actor={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function DatasetDemoTable({ demo, name }: { demo: DatasetDemo; name: string }) {
  return (
    <div className="dataset-demo-table-wrap">
      <table className="dataset-demo-table">
        <caption>Симулированные строки dataset «{name}»</caption>
        <thead><tr>{demo.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{demo.rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("-")}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function datasetSequence(dataset: TenderDataset) {
  return String(tenderDatasets.findIndex((item) => item.id === dataset.id) + 1).padStart(3, "0");
}

function DatasetDrawer({ dataset, onClose }: { dataset: TenderDataset; onClose: () => void }) {
  const family = dataFamilies.find((item) => item.id === dataset.familyId)!;
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="atlas-drawer dataset-drawer" role="dialog" aria-modal="true" aria-labelledby="dataset-drawer-title" style={{ "--item-color": family.color } as CSSProperties}>
        <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        <div className="dataset-profile-id">
          <b>№ {datasetSequence(dataset)}</b>
          <span>DATASET ID</span>
          <strong>{dataset.id.replace("dataset:", "")}</strong>
          <small>{dataset.status}</small>
        </div>
        <h2 id="dataset-drawer-title">{dataset.name.en}</h2><p className="drawer-ru">{dataset.name.ru}</p>
        <div className="drawer-badges"><span>{family.code} · {family.name.en}</span><span>{priorityLabels[dataset.priority]}</span><span>Difficulty {dataset.difficulty}</span></div>
        <section><span>WHAT IT CONTAINS</span><strong>{dataset.contains}</strong><p>{dataset.value}</p></section>
        <section className="dataset-example"><span>ПРИМЕР · DEMO · СИМУЛИРОВАННЫЕ ДАННЫЕ</span><DatasetDemoTable demo={dataset.demo} name={dataset.name.ru || dataset.name.en} /></section>
        <div className="actor-detail-grid">
          <section><span>ORIGIN</span><p>{dataset.origin}</p></section>
          <section><span>VISIBILITY</span><p>{dataset.visibility.join(" · ")}</p></section>
          <section><span>ACCESS</span><p>{dataset.accessTypes.join(" · ")}</p></section>
          <section><span>UPDATE</span><p>{dataset.updateFrequency}</p></section>
          <section><span>HISTORICAL DEPTH</span><p>{dataset.historicalDepth}</p></section>
          <section><span>GEOGRAPHY</span><p>{dataset.geographicCoverage}</p></section>
        </div>
        <section className="source-preview"><span>REPRESENTATIVE SOURCES</span>{dataset.exampleSources.length ? <div className="chip-list">{dataset.exampleSources.map((item) => <i key={item}>{item}</i>)}</div> : <p>Source-neutral logical dataset. Providers vary by jurisdiction.</p>}</section>
        <footer>Logical dataset · provider and portal are catalogued separately</footer>
      </aside>
    </div>
  );
}

type DataTab = "datasets" | "sources" | "architecture" | "proprietary";

function DataPage() {
  const [tab, setTab] = useState<DataTab>("datasets");
  const [query, setQuery] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [priority, setPriority] = useState("all");
  const requestedDatasetSlug = new URLSearchParams(window.location.search).get("dataset");
  const [selected, setSelected] = useState<TenderDataset | null>(() => tenderDatasets.find((item) => item.slug === requestedDatasetSlug) ?? null);
  const proprietaryFamily = "data-family:TEA-D16";
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return tenderDatasets.filter((item) => {
      const familyMatch = tab === "proprietary" ? item.familyId === proprietaryFamily : familyId === "all" || item.familyId === familyId;
      const priorityMatch = priority === "all" || item.priority === priority;
      const haystack = [item.id, item.name.en, item.name.ru, item.contains, item.value, ...item.demo.columns, ...item.demo.rows.flat(), ...item.exampleSources].join(" ").toLocaleLowerCase("ru");
      return familyMatch && priorityMatch && (!normalized || haystack.includes(normalized));
    });
  }, [familyId, priority, query, tab]);

  return (
    <>
      <PageIntro kicker="CATALOGUE 02 · DATABASES / DATA SOURCES" title="What information exists" accent="across procurement?" text="Database, Dataset, Provider, Portal и Document Repository различаются. Atlas каталогизирует data itself, его происхождение, доступность и maturity без назначения users или Agents." aside={<><StatusTag /><strong>{tenderDatasets.length} Datasets</strong><p>{dataFamilies.length} families · {dataSources.length} representative source systems.</p></>} />
      <section className="data-tabs segmented large" role="tablist">
        {(["datasets", "sources", "architecture", "proprietary"] as DataTab[]).map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item === "datasets" ? "Dataset Catalogue" : item === "sources" ? "Sources & Providers" : item === "architecture" ? "Data Architecture" : "Proprietary Assets"}</button>)}
      </section>

      {(tab === "datasets" || tab === "proprietary") && <>
        <section className="catalogue-controls data-controls">
          <label className="catalogue-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти dataset по содержанию или назначению" /></label>
          {tab === "datasets" && <select value={familyId} onChange={(event) => setFamilyId(event.target.value)}><option value="all">All data families</option>{dataFamilies.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name.en}</option>)}</select>}
          <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option>{Object.entries(priorityLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
          <span className="result-count">{filtered.length} / {tab === "proprietary" ? tenderDatasets.filter((item) => item.familyId === proprietaryFamily).length : tenderDatasets.length}</span>
        </section>
        {tab === "datasets" && <section className="family-strip">{dataFamilies.map((item) => <button className={familyId === item.id ? "active" : ""} onClick={() => setFamilyId(familyId === item.id ? "all" : item.id)} key={item.id} style={{ "--item-color": item.color } as CSSProperties}><span>{item.code}</span><strong>{item.name.en}</strong><small>{tenderDatasets.filter((dataset) => dataset.familyId === item.id).length}</small></button>)}</section>}
        {tab === "proprietary" && <section className="proprietary-intro"><span>STRATEGIC DATA ASSETS</span><h2>Данные, которые не существуют снаружи в готовом виде</h2><p>Они формируются из normalized history, identity resolution, verified private evidence и накопленных outcomes.</p></section>}
        <section className="dataset-table" aria-label="Dataset catalogue">
          <header><span>№</span><span>DATASET ID</span><span>DATASET</span><span>FAMILY</span><span>MODEL</span><span>PRIORITY</span><span>VALUE</span><span /></header>
          {filtered.map((item) => {
            const family = dataFamilies.find((candidate) => candidate.id === item.familyId)!;
            return <button key={item.id} onClick={() => { setSelected(item); window.history.replaceState(null, "", `/data?dataset=${encodeURIComponent(item.slug)}`); }} style={{ "--item-color": family.color } as CSSProperties}><span className="dataset-sequence-cell"><small>№</small><strong>{datasetSequence(item)}</strong></span><span className="dataset-id-cell"><small>DATASET ID</small><strong>{item.id.replace("dataset:", "")}</strong></span><span className="dataset-name-cell"><b>{item.name.en}</b><small>{item.name.ru}</small></span><span><i>{family.code}</i>{family.name.en}</span><span>{item.origin}<small>{item.visibility.join(" · ")}</small></span><span><em className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</em><small>Difficulty {item.difficulty}</small></span><span>{item.value}</span><span>→</span></button>;
          })}
        </section>
        {filtered.length === 0 && <div className="empty-state"><strong>Ничего не найдено</strong><button onClick={() => { setQuery(""); setFamilyId("all"); setPriority("all"); }}>Сбросить фильтры</button></div>}
      </>}

      {tab === "sources" && <section className="source-grid">{dataSources.map((item) => <article key={item.id}><div><span>{item.id.replace("source:TEA-SRC-", "")}</span><b>{item.coverage}</b></div><h2>{item.provider}</h2><p>{item.summary}</p><div className="chip-list">{item.access.map((value) => <i key={value}>{value}</i>)}</div><small>{item.rightsNote}</small><a href={item.url} target="_blank" rel="noreferrer">Open official source ↗</a></article>)}</section>}

      {tab === "architecture" && <DataArchitecture />}
      {selected && <DatasetDrawer dataset={selected} onClose={() => { setSelected(null); window.history.replaceState(null, "", "/data"); }} />}
    </>
  );
}

function DataArchitecture() {
  const layers = [
    ["L0", "Source & Rights", "Provider, licence, permitted use, refresh policy"],
    ["L1", "Immutable Evidence / Raw", "Original API responses, files, timestamps, hashes"],
    ["L2", "Extracted & Canonical Records", "Normalized dates, currencies, units and fields"],
    ["L3", "Master Entities & Identity", "Canonical projects, procedures, companies and products"],
    ["L4", "Temporal Relations & Events", "Versioned data-to-data relationships and history"],
    ["L5", "Derived Intelligence", "Benchmarks, patterns, indicators and analytical datasets"],
    ["L6", "Serving Datasets", "Search indexes, snapshots, exports and application views"],
  ];
  return <section className="data-architecture"><div className="architecture-heading"><span>RECOMMENDED LAYERS</span><h2>Evidence remains traceable through every transformation</h2><p>Provenance, version, confidence, rights и access classification проходят через все layers.</p></div><div className="layer-stack">{layers.map(([code, name, text], index) => <article key={code}><b>{code}</b><div><strong>{name}</strong><span>{text}</span></div>{index < layers.length - 1 && <i>↓</i>}</article>)}</div><div className="governance-rail"><span>CROSS-CUTTING CONTROL</span><p>Provenance · Versioning · Confidence · Licensing · PII · Quality · Retention</p></div></section>;
}

function GlossaryPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedScope = params.get("scope");
  const initialScope = requestedScope && requestedScope in glossaryScopeLabels ? requestedScope : "all";
  const [scope, setScope] = useState(initialScope);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return glossaryTerms.filter((item) => (scope === "all" || item.scopes.includes(scope as GlossaryScope)) && (!normalized || [item.term, item.name.ru, item.definition, ...item.aliases].join(" ").toLocaleLowerCase("ru").includes(normalized)));
  }, [query, scope]);
  return <><PageIntro kicker="SHARED CANONICAL LANGUAGE" title="One Glossary." accent="Contextual subsets." text="Термин хранится один раз и может иметь contextual usage для TenderLab.ai или Atlas. Это предотвращает расхождение определений между приложениями." aside={<><StatusTag /><strong>{glossaryTerms.length} Terms</strong><p>English canonical term · Russian explanation · aliases · scopes.</p></>} /><section className="catalogue-controls"><label className="catalogue-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти термин, alias или определение" /></label><div className="segmented glossary-scopes"><button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>All</button>{Object.entries(glossaryScopeLabels).map(([key, label]) => <button className={scope === key ? "active" : ""} onClick={() => setScope(key)} key={key}>{label}</button>)}</div><span className="result-count">{filtered.length}</span></section><section className="glossary-list">{filtered.map((item, index) => <article key={item.id}><div><span>{String(index + 1).padStart(2, "0")}</span><b>{item.id}</b></div><h2>{item.term}</h2><h3>{item.name.ru}</h3><p>{item.definition}</p><footer><div className="chip-list">{item.scopes.map((value) => <i key={value}>{glossaryScopeLabels[value]}</i>)}</div>{item.aliases.length > 0 && <small>Aliases: {item.aliases.join(" · ")}</small>}</footer></article>)}</section></>;
}

type RealAgentView = "overview" | "implementations" | "patterns" | "lessons";

const realAgentViews: { id: RealAgentView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "implementations", label: "Implementations" },
  { id: "patterns", label: "Reusable Patterns" },
  { id: "lessons", label: "Lessons Learned" },
];

const maturityLabels = {
  "concept-or-simulation": "Concept / simulation",
  "isolated-method-validated": "Isolated method validated",
  "validated-client-workflow": "Validated client workflow",
  "controlled-pilot": "Controlled pilot",
  "enterprise-runtime": "Enterprise runtime",
} as const;

const evidenceStrengthLabels = {
  "unit-or-synthetic-fixture": "Unit / synthetic fixture",
  "isolated-authorized-realistic-document": "Isolated realistic evidence",
  "local-production-build-replay": "Local production-build replay",
  "deployed-smoke-verification": "Deployed smoke verification",
  "deployed-or-equivalent-representative-replay": "Representative deployed replay",
} as const;

const implementationById = new Map(realAgentImplementations.map((item) => [item.id, item]));
const clientProductById = new Map(clientProducts.map((item) => [item.id, item]));
const agentByRegistryId = new Map(agents.map((item) => [item.registryId, item]));

function ImplementationReferences({ ids }: { ids: RealAgentImplementation["id"][] }) {
  return <div className="real-agent-reference-list">{ids.map((id) => {
    const implementation = implementationById.get(id);
    return implementation ? <a href={`/real-agents/implementations#${implementation.slug}`} key={id}>{implementation.name}</a> : <span key={id}>{id}</span>;
  })}</div>;
}

function RealAgentImplementationCard({ implementation }: { implementation: RealAgentImplementation }) {
  const agent = agentByRegistryId.get(implementation.ownerAgentId);
  const product = clientProductById.get(implementation.clientProductId);
  return <article className="real-agent-implementation-card" id={implementation.slug}>
    <header>
      <div><span>{implementation.id}</span><h2>{implementation.name}</h2><p>{implementation.descriptor}</p></div>
      <div className="real-agent-badge-stack"><b>{maturityLabels[implementation.maturity]}</b><i>{implementation.deploymentStatus.replaceAll("-", " ")}</i></div>
    </header>
    <section className="real-agent-implementation-meta" aria-label={`${implementation.name} development status`}>
      <div><span>CANONICAL AGENT</span><strong>{implementation.ownerAgentId}</strong><small>{agent?.name}</small></div>
      <div><span>PRODUCT LIFECYCLE</span><strong>{product?.status.replaceAll("-", " ")}</strong><small>Separate from method maturity</small></div>
      <div><span>EVIDENCE</span><strong>{evidenceStrengthLabels[implementation.evidenceStrength]}</strong><small>Method v{implementation.methodologyVersion}</small></div>
      <div><span>RUNTIME</span><strong>{implementation.runtimeReadiness.replaceAll("-", " ")}</strong><small>Not enterprise runtime</small></div>
    </section>
    <section className="real-agent-tor"><span>TOR / AUTHORITY BOUNDARY</span><p>{implementation.tor}</p></section>
    <div className="real-agent-io">
      <section><span>WHAT CLIENT PROVIDES</span><ul>{implementation.primaryInputs.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><span>WHAT THE AGENT RETURNS</span><strong>{implementation.primaryOutput}</strong><p>{implementation.downstreamConsumer}</p></section>
    </div>
    <section className="real-agent-limitations"><span>KNOWN LIMITATIONS</span><ul>{implementation.knownLimitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <footer>
      {agent && <a href={`/agents/${agent.slug}`}>Open Agent Specification →</a>}
      {product && implementation.deploymentStatus !== "not-deployed"
        ? <a href={`https://tenderapps-ai.web.app${product.clientRoute}`} rel="noreferrer" target="_blank">Open test product ↗</a>
        : product && <span>{product.clientRoute} · local integration only</span>}
      <small>{implementation.patternIds.length} patterns · {implementation.lessonIds.length} lessons · updated {implementation.updatedAt}</small>
    </footer>
  </article>;
}

function RealAgentPatternCard({ pattern }: { pattern: RealAgentReusablePattern }) {
  return <article className="real-agent-pattern-card">
    <header><span>{pattern.id}</span><b>{pattern.status}</b></header>
    <h2>{pattern.title}</h2>
    <section><span>PROBLEM</span><p>{pattern.problem}</p></section>
    <section className="pattern-rule"><span>REUSABLE RULE</span><strong>{pattern.rule}</strong></section>
    <footer><div><small>CONFIRMED BY</small><ImplementationReferences ids={pattern.confirmedByImplementationIds} /></div><div><small>METHODOLOGY GATES</small><p>{pattern.methodologyGateIds.join(" · ")}</p></div></footer>
  </article>;
}

function RealAgentLessonCard({ lesson }: { lesson: RealAgentLesson }) {
  return <article className="real-agent-lesson-card">
    <header><span>{lesson.id}</span><div><b>{lesson.classification}</b><i>{lesson.evidenceScope.replaceAll("-", " ")}</i></div></header>
    <h3>{lesson.title}</h3>
    <dl><div><dt>What happened</dt><dd>{lesson.whatHappened}</dd></div><div><dt>Root cause</dt><dd>{lesson.rootCause}</dd></div><div><dt>Retained rule</dt><dd>{lesson.reusableRule}</dd></div></dl>
    <footer><div><small>SOURCE IMPLEMENTATIONS</small><ImplementationReferences ids={lesson.implementationIds} /></div><p>{lesson.methodologyImpact}</p></footer>
  </article>;
}

function RealAgentDevelopmentPage({ requestedView }: { requestedView?: string }) {
  const view: RealAgentView = realAgentViews.some((item) => item.id === requestedView) ? requestedView as RealAgentView : "overview";
  const generalLessons = realAgentLessons.filter((item) => item.classification === "general");
  const agentLessons = realAgentLessons.filter((item) => item.classification === "agent-specific");
  const maturitySteps = [
    ["01", "Concept / simulation", "Canonical purpose and deterministic demonstration"],
    ["02", "Isolated method", "Uncertain intelligence validated on bounded real evidence"],
    ["03", "Client workflow", "Case, review, artifacts, recovery, and outputs verified"],
    ["04", "Controlled pilot", "Authorized users, monitored evidence, and operational controls"],
    ["05", "Enterprise runtime", "Durable tenancy, authorization, audit, orchestration, and recovery"],
  ];

  return <div className="real-agent-development-page">
    <PageIntro
      kicker="STRATEGY → REAL IMPLEMENTATION → LEARNING"
      title="From Agent Strategy"
      accent="to Real Agent."
      text="A human-facing knowledge map of how approved Tender Ecosystem capabilities become evidence-validated client products. Atlas explains the method and accumulated learning; Skills and playbooks remain the operational instructions."
      aside={<><span className="status-tag"><i /> VALIDATED KNOWLEDGE LAYER</span><strong>{realAgentImplementations.length} real implementations</strong><p>{realAgentReusablePatterns.length} reusable patterns · {realAgentLessons.length} retained lessons · operational method v2.0.0.</p></>}
    />

    <nav className="real-agent-view-nav" aria-label="Real Agent Development views">
      {realAgentViews.map((item) => <a aria-current={view === item.id ? "page" : undefined} href={`/real-agents/${item.id}`} key={item.id}>{item.label}</a>)}
    </nav>

    {view === "overview" && <>
      <section className="real-agent-bridge" aria-label="Strategy to learning lifecycle">
        {[
          ["01", "Agent Strategy & Simulation", "Canonical identity, purpose, architecture, and simulated Case role."],
          ["02", "Real Agent Development", "Contracts, authorized evidence, isolated experiment, audit, and method approval."],
          ["03", "Real Implementations", "Client workflow, explicit Case result, artifacts, review, and bounded release."],
          ["04", "Accumulated Learning", "Validated patterns feed the method; domain rules return to the owning playbook."],
        ].map(([number, title, note], index) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{note}</p>{index < 3 && <i aria-hidden="true">→</i>}</article>)}
      </section>

      <section className="real-agent-knowledge-roles">
        <div className="section-title"><p>ONE CYCLE · THREE KNOWLEDGE HOMES</p><h2>Complementary, not duplicated.</h2></div>
        <div>
          <article><span>HUMAN-FACING</span><h3>Tender Ecosystem Atlas</h3><p>Strategic map, maturity, implementations, evidence-backed lessons, reusable patterns, and relationships.</p></article>
          <article><span>CODEX-FACING</span><h3>Methodology / Skill</h3><p>Operational gates and invariants used when Codex builds, verifies, and releases the next real Agent.</p></article>
          <article><span>DOMAIN-FACING</span><h3>Agent Playbooks</h3><p>Financial, logistics, OCR, Incoterm, pricing, and future domain rules with their own fixtures and regressions.</p></article>
        </div>
      </section>

      <section className="real-agent-maturity">
        <div className="section-title"><p>MATURITY WITHOUT INFLATION</p><h2>Deployment is not enterprise runtime.</h2></div>
        <div>{maturitySteps.map(([number, title, note]) => <article key={number}><span>{number}</span><strong>{title}</strong><p>{note}</p></article>)}</div>
      </section>

      <section className="real-agent-feedback-loop">
        <span>REPEATABLE FEEDBACK LOOP</span>
        <div>{["Build Real Agent", "Audit actual output", "Classify lessons", "Update method / playbook", "Publish Atlas projection", "Use for next Agent"].map((item, index) => <article key={item}><b>{String(index + 1).padStart(2, "0")}</b><strong>{item}</strong>{index < 5 && <i aria-hidden="true">→</i>}</article>)}</div>
        <p>Candidate lessons remain technical evidence until reviewed. General rules enter the method; Agent-specific rules remain in the owning playbook. Atlas publishes the curated relationship and history.</p>
      </section>
    </>}

    {view === "implementations" && <section className="real-agent-implementation-view">
      <div className="section-title"><p>CANONICAL IMPLEMENTATION REGISTRY</p><h2>Real products linked to strategic Agents.</h2></div>
      <p className="real-agent-section-intro">Product lifecycle, method maturity, deployment, and runtime readiness are separate dimensions. A deployed test surface does not imply enterprise operation.</p>
      <div className="real-agent-implementation-grid">{realAgentImplementations.map((item) => <RealAgentImplementationCard implementation={item} key={item.id} />)}</div>
    </section>}

    {view === "patterns" && <section className="real-agent-pattern-view">
      <div className="section-title"><p>VALIDATED ACROSS IMPLEMENTATION EVIDENCE</p><h2>Reusable patterns, not copied debugging.</h2></div>
      <p className="real-agent-section-intro">Patterns summarize repeatable architecture and development rules. Domain formulas and parsing details stay in Agent playbooks.</p>
      <div className="real-agent-pattern-grid">{realAgentReusablePatterns.map((item) => <RealAgentPatternCard pattern={item} key={item.id} />)}</div>
    </section>}

    {view === "lessons" && <section className="real-agent-lessons-view">
      <div className="section-title"><p>CURATED EVIDENCE REGISTER</p><h2>Learning with provenance and ownership.</h2></div>
      <p className="real-agent-section-intro">Every lesson retains its source implementation, evidence scope, failure family, accepted rule, and operational destination.</p>
      <section className="real-agent-lesson-group"><header><span>GENERAL METHODOLOGY</span><strong>{generalLessons.length} validated lessons</strong></header><div>{generalLessons.map((item) => <RealAgentLessonCard lesson={item} key={item.id} />)}</div></section>
      <section className="real-agent-lesson-group agent-specific"><header><span>AGENT-SPECIFIC</span><strong>{agentLessons.length} playbook-owned lessons</strong></header><p>Atlas retains only the strategic summary. Operative details remain in the linked financial or logistics playbook.</p><div>{agentLessons.map((item) => <RealAgentLessonCard lesson={item} key={item.id} />)}</div></section>
    </section>}
  </div>;
}

function MethodologyPage() {
  return <><PageIntro kicker="CATALOGUE GOVERNANCE" title="Independent first." accent="Connected only when mature." text="Atlas keeps each catalogue independently governed. Cross-catalogue links live in a separate typed relationship registry and never redefine Agent or Dataset identity." aside={<><StatusTag /><strong>Method V1.2</strong><p>Taxonomy → validation → canonical freeze → typed relationships → runtime evidence.</p></>} /><section className="method-grid"><article><span>01 · BOUNDARY</span><h2>Separate catalogues</h2><p>Agents describe capabilities. Actors describe participants. Datasets describe information. Ни один каталог не должен определяться через другой.</p></article><article><span>02 · IDENTITY</span><h2>Stable canonical IDs</h2><p>Labels и slugs могут уточняться. ID остаётся стабильным и становится точкой cross-application ссылки.</p></article><article><span>03 · MATURITY</span><h2>Explicit status</h2><p><b>Draft</b> — исследуется. <b>Validated</b> — принят. <b>Deprecated</b> — сохранён для compatibility.</p></article><article><span>04 · EVIDENCE</span><h2>Source-aware records</h2><p>Definitions, data coverage и access claims должны сохранять provenance и effective date.</p></article><article><span>05 · RUNTIME IDENTITY</span><h2>Definition is not execution</h2><p>Process Definition, Process Instance и Agent Execution получают разные identities. Admin UI управляет ими, но backend доказывает фактическое исполнение журналом и Artifacts.</p></article></section><section className="id-model"><div><span>CANONICAL NAMESPACES</span><h2>IDs survive UI and route changes</h2></div><code>agent:TL-A001</code><code>process-definition:TL-PD001</code><code>process-instance:CASE1-P01</code><code>agent-execution:CASE1-P01-A015-01</code><code>dataset:TEA-DS-TENDER-NOTICES</code><code>artifact:CASE1-ART-001</code></section><section className="deferred-banner"><span>CONTROLLED V1 · AGENT SIDE</span><strong>Agent → Deliverable → Dataset Relationship Registry</strong><p>Typed, versionable relations are stored separately from both catalogues. Dataset reverse-navigation remains intentionally deferred until the first relation set is validated.</p></section><a className="method-real-agent-link" href="/real-agents"><span>EMPIRICAL DEVELOPMENT METHOD</span><strong>See how approved Agent concepts become real implementations.</strong><i>Open Real Agent Development →</i></a></>;
}

function NotFoundPage() {
  return <section className="not-found"><span>404</span><h1>Atlas page not found.</h1><p>Запрошенная страница не входит в текущую структуру Atlas.</p><a href="/">Return to Overview →</a></section>;
}

export default function App() {
  const path = currentPath();
  let page: ReactNode;
  if (path === "/") page = <OverviewPage />;
  else if (path === "/agents" || path.startsWith("/agents/")) page = <AgentSpecificationsPage requestedSlug={path.split("/")[2]} />;
  else if (path === "/real-agents" || path.startsWith("/real-agents/")) page = <RealAgentDevelopmentPage requestedView={path.split("/")[2]} />;
  else if (path === "/orchestration") page = <ProcessOperationsPage />;
  else if (path === "/actors") page = <ActorsPage />;
  else if (path === "/data") page = <DataPage />;
  else if (path === "/glossary") page = <GlossaryPage />;
  else if (path === "/methodology") page = <MethodologyPage />;
  else page = <NotFoundPage />;
  return <><AtlasHeader path={path} /><main className="atlas-main">{page}</main><AtlasFooter /></>;
}

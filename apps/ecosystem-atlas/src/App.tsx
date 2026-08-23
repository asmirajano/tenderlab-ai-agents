import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
/* eslint-disable @next/next/no-html-link-for-pages -- this package is an independent Vite SPA, not a Next.js app */
import { ProductBrand } from "../../../packages/design-system/src/ProductBrand";
import {
  actorTypes,
  authorityLabels,
  dataFamilies,
  dataSources,
  directnessLabels,
  glossaryScopeLabels,
  glossaryTerms,
  priorityLabels,
  tenderDatasets,
  tenderSides,
} from "../../../packages/catalog-data/src";
import type {
  ActorType,
  DatasetDemo,
  GlossaryScope,
  TenderDataset,
} from "../../../packages/catalog-schema/src";

const mainAppUrl = "https://tenderlab-ai-agents.web.app";

const navItems = [
  { href: "/", label: "Overview" },
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
          <a aria-current={path === item.href ? "page" : undefined} href={item.href} key={item.href}>{item.label}</a>
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
      <p>Independent catalogues now. Canonical connections later.</p>
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
  ];

  return (
    <>
      <PageIntro
        kicker="TENDER ECOSYSTEM · REFERENCE SYSTEM"
        title="Map the environment."
        accent="Keep the operating system focused."
        text="Tender Ecosystem Atlas описывает участников, данные и reference structures вокруг TenderLab.ai. Каталоги развиваются независимо, получают стабильные ID и остаются готовыми к будущим связям."
        aside={<><StatusTag /><strong>Boundary</strong><p><b>Atlas</b> объясняет среду закупок.<br /><b>TenderLab.ai</b> объясняет и выполняет agent workflows.</p></>}
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
            <p>Sides, Actor Types, Datasets, Sources, terminology и methodology.</p>
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
      </section>

      <section className="deferred-banner">
        <span>RELATIONSHIPS · INTENTIONALLY DEFERRED</span>
        <strong>Agents ↔ Actors ↔ Data пока не моделируются.</strong>
        <p>Сначала каждый каталог должен стать достаточно зрелым и внутренне согласованным. Отдельный relationship layer появится после validation.</p>
      </section>
    </>
  );
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
  const [selected, setSelected] = useState<TenderDataset | null>(null);
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
          <header><span>DATASET ID</span><span>DATASET</span><span>FAMILY</span><span>MODEL</span><span>PRIORITY</span><span>VALUE</span><span /></header>
          {filtered.map((item) => {
            const family = dataFamilies.find((candidate) => candidate.id === item.familyId)!;
            return <button key={item.id} onClick={() => setSelected(item)} style={{ "--item-color": family.color } as CSSProperties}><span className="dataset-id-cell"><small>DATASET ID</small><strong>{item.id.replace("dataset:", "")}</strong></span><span className="dataset-name-cell"><b>{item.name.en}</b><small>{item.name.ru}</small></span><span><i>{family.code}</i>{family.name.en}</span><span>{item.origin}<small>{item.visibility.join(" · ")}</small></span><span><em className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</em><small>Difficulty {item.difficulty}</small></span><span>{item.value}</span><span>→</span></button>;
          })}
        </section>
        {filtered.length === 0 && <div className="empty-state"><strong>Ничего не найдено</strong><button onClick={() => { setQuery(""); setFamilyId("all"); setPriority("all"); }}>Сбросить фильтры</button></div>}
      </>}

      {tab === "sources" && <section className="source-grid">{dataSources.map((item) => <article key={item.id}><div><span>{item.id.replace("source:TEA-SRC-", "")}</span><b>{item.coverage}</b></div><h2>{item.provider}</h2><p>{item.summary}</p><div className="chip-list">{item.access.map((value) => <i key={value}>{value}</i>)}</div><small>{item.rightsNote}</small><a href={item.url} target="_blank" rel="noreferrer">Open official source ↗</a></article>)}</section>}

      {tab === "architecture" && <DataArchitecture />}
      {selected && <DatasetDrawer dataset={selected} onClose={() => setSelected(null)} />}
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

function MethodologyPage() {
  return <><PageIntro kicker="CATALOGUE GOVERNANCE" title="Independent first." accent="Connected only when mature." text="Atlas separates catalogue definition from future relationship modelling. Stable identities, source boundaries and version status are established before any cross-catalogue graph." aside={<><StatusTag /><strong>Method V1</strong><p>Taxonomy → validation → canonical freeze → relationships.</p></>} /><section className="method-grid"><article><span>01 · BOUNDARY</span><h2>Separate catalogues</h2><p>Agents describe capabilities. Actors describe participants. Datasets describe information. Ни один каталог не должен определяться через другой.</p></article><article><span>02 · IDENTITY</span><h2>Stable canonical IDs</h2><p>Labels и slugs могут уточняться. ID остаётся стабильным и становится будущей точкой ссылки.</p></article><article><span>03 · MATURITY</span><h2>Explicit status</h2><p><b>Draft</b> — исследуется. <b>Validated</b> — принят. <b>Deprecated</b> — сохранён для compatibility.</p></article><article><span>04 · EVIDENCE</span><h2>Source-aware records</h2><p>Definitions, data coverage и access claims должны сохранять provenance и effective date.</p></article></section><section className="id-model"><div><span>CANONICAL NAMESPACES</span><h2>IDs survive UI and route changes</h2></div><code>agent:TL-A001</code><code>side:TEA-S01</code><code>actor-type:TEA-AT-MANUFACTURER</code><code>dataset:TEA-DS-TENDER-NOTICES</code><code>source:TEA-SRC-TED</code><code>term:TEA-G-ENTITY-RESOLUTION</code></section><section className="deferred-banner"><span>FUTURE · NOT IMPLEMENTED</span><strong>Relationship Registry</strong><p>Будущий layer будет хранить explicit, versioned и evidence-backed relations. Он не будет вложен внутрь Agent, Actor или Dataset records.</p></section></>;
}

function NotFoundPage() {
  return <section className="not-found"><span>404</span><h1>Atlas page not found.</h1><p>Запрошенная страница не входит в текущую структуру Atlas.</p><a href="/">Return to Overview →</a></section>;
}

export default function App() {
  const path = currentPath();
  let page: ReactNode;
  if (path === "/") page = <OverviewPage />;
  else if (path === "/actors") page = <ActorsPage />;
  else if (path === "/data") page = <DataPage />;
  else if (path === "/glossary") page = <GlossaryPage />;
  else if (path === "/methodology") page = <MethodologyPage />;
  else page = <NotFoundPage />;
  return <><AtlasHeader path={path} /><main className="atlas-main">{page}</main><AtlasFooter /></>;
}

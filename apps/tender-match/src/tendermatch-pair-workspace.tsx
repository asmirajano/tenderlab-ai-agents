import { useEffect, useState, type ReactNode } from "react";
import { runtimeTenders, supplierActivity, type SupplierRecord, type TenderMatchCaseResult, type TenderRecord } from "../../../packages/tendermatch/src/index.ts";
import { queryTenderMatchPairs, requestTenderMatchAssessment, type AssessmentState, type PairPage, type PairQuery, type TenderMatchCompactPair } from "./tendermatch-pair-api.ts";
import { retrievalScoreLabel } from "./tendermatch-pair-display.ts";
import type { TenderMatchRuntimeCatalog } from "./tendermatch-supplier-api.ts";

type OpenPair = (supplierId: string, tenderId: string) => void;
function keyOf(pair: { tenderId: string; supplierId: string }) { return `${pair.tenderId}::${pair.supplierId}`; }
function label(value: string) { return value.toLowerCase().replace(/[_-]/g, " ").replace(/^./, (first) => first.toUpperCase()); }
function metric(value: number | null | undefined, percent = false) { return value === null || value === undefined ? "—" : `${value}${percent ? "%" : ""}`; }
function scoreBand(value: number | null) { return value !== null && value >= 61 ? "priority" : value !== null && value >= 41 ? "review" : "archive"; }
function scopeLabel(pair: TenderMatchCompactPair) { return pair.eligibility.state === "ELIGIBLE" ? `${pair.dataCoverage}% coverage` : label(pair.eligibility.state); }

function usePairPage(runtime: TenderMatchRuntimeCatalog, query: PairQuery) {
  const [state, setState] = useState<{ identity?: string; page?: PairPage; loading: boolean; error?: string }>({ loading: true });
  const identity = JSON.stringify(query);
  useEffect(() => {
    const controller = new AbortController();
    const currentQuery = JSON.parse(identity) as PairQuery;
    if (currentQuery.supplierIds?.length === 0 || currentQuery.tenderIds?.length === 0) return () => controller.abort();
    queryTenderMatchPairs(runtime, currentQuery, controller.signal).then((page) => { if (!controller.signal.aborted) setState({ identity, page, loading: false }); }).catch((error) => {
      if (!controller.signal.aborted) setState({ identity, loading: false, error: error instanceof Error ? error.message : "Pair page could not be loaded." });
    });
    return () => controller.abort();
  }, [identity, runtime]);
  if (query.supplierIds?.length === 0 || query.tenderIds?.length === 0) return { loading: false, page: { items: [], total: 0, offset: 0, limit: query.limit ?? 25, nextCursor: null } };
  return state.identity === identity ? state : { loading: true };
}

function PageState({ loading, error }: { loading: boolean; error?: string }) {
  return <>{loading && <p role="status" className="tb3-table-empty">Loading this pair page…</p>}{error && <p role="alert" className="tb3-alert">{error}</p>}</>;
}

export function PairPipelineNote() {
  return <p className="tb3-pair-pipeline" data-pair-semantics="independent">Eligible pairs receive deterministic Formula v1.1 scores once. Retrieval ranks a shortlist separately. Full TORS/AI runs only for a justified request; ordinary scoring uses no model calls. Human disposition remains separate.</p>;
}

export function SelectedPairAssessment({ runtime, supplierId, tenderId }: { runtime: TenderMatchRuntimeCatalog; supplierId: string; tenderId: string }) {
  const [state, setState] = useState<AssessmentState | { state: "not-requested"; reason: string }>({ state: "not-requested", reason: "No full TORS/AI assessment has been requested for this pair." });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function request() {
    setBusy(true); setError("");
    try { setState(await requestTenderMatchAssessment(runtime, supplierId, tenderId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Assessment request failed."); }
    finally { setBusy(false); }
  }
  return <section className="tb3-selected-assessment" aria-label="Separate full TORS assessment"><h3>Full TORS/AI assessment</h3><p role="status"><b>{label(state.state)}</b> · {state.reason}</p><button type="button" disabled={busy || state.state === "queued" || state.state === "running"} onClick={request}>{busy ? "Requesting assessment…" : "Request assessment for this pair"}</button><small>Requesting an assessment never changes Pair Score or consultant disposition.</small>{error && <p role="alert">{error}</p>}</section>;
}

export function PagedPairMatrix({ runtime, suppliers, onOpen }: { runtime: TenderMatchRuntimeCatalog; suppliers: SupplierRecord[]; onOpen: OpenPair }) {
  const [supplierQuery, setSupplierQuery] = useState("");
  const [tenderQuery, setTenderQuery] = useState("");
  const [supplierPage, setSupplierPage] = useState(0);
  const [tenderPage, setTenderPage] = useState(0);
  const [supplierSort, setSupplierSort] = useState("name-asc");
  const [supplierLimit, setSupplierLimit] = useState(10);
  const [tenderLimit, setTenderLimit] = useState(8);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const supplierRows = suppliers.filter((entry) => `${entry.legalEnglishName} ${supplierActivity(entry)}`.toLowerCase().includes(supplierQuery.toLowerCase())).sort((left, right) => supplierSort === "score-desc" ? (runtime.pairLeadersBySupplier?.[right.id]?.pairScore ?? -1) - (runtime.pairLeadersBySupplier?.[left.id]?.pairScore ?? -1) || left.legalEnglishName.localeCompare(right.legalEnglishName) : supplierSort === "name-desc" ? right.legalEnglishName.localeCompare(left.legalEnglishName) : left.legalEnglishName.localeCompare(right.legalEnglishName));
  const tenderRows = runtimeTenders.filter((entry) => `${entry.reference} ${entry.title} ${entry.country}`.toLowerCase().includes(tenderQuery.toLowerCase()));
  const visibleSuppliers = supplierRows.slice(supplierPage * supplierLimit, (supplierPage + 1) * supplierLimit);
  const visibleTenders = tenderRows.slice(tenderPage * tenderLimit, (tenderPage + 1) * tenderLimit);
  const query: PairQuery = { supplierIds: visibleSuppliers.map((entry) => entry.id), tenderIds: visibleTenders.map((entry) => entry.id), limit: 200 };
  const { page, loading, error } = usePairPage(runtime, query);
  const byKey = new Map((page?.items ?? []).map((pair) => [keyOf(pair), pair]));
  async function exportPage(format: "csv" | "xlsx") {
    if (!page) return;
    setExporting(true); setExportError("");
    try {
      const columns = ["Supplier ID", "Tender ID", "Pair Score", "Data Coverage", "Evidence Confidence", "Retrieval Relevance", "Main limitation", "Formula version"];
      const rows = page.items.map((pair) => [pair.supplierId, pair.tenderId, pair.pairScore, pair.dataCoverage, pair.evidenceConfidence, pair.retrievalScore, pair.mainLimitation, pair.formulaVersion]);
      let blob: Blob;
      if (format === "xlsx") {
        const { default: ExcelJS } = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Requested matrix window", { views: [{ state: "frozen", ySplit: 1 }] });
        sheet.addRow(columns); sheet.addRows(rows); sheet.columns.forEach((column) => { column.width = 25; });
        blob = new Blob([await workbook.xlsx.writeBuffer() as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      } else {
        const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
        blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      }
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = `tendermatch-requested-window.${format}`; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Requested window export failed."); }
    finally { setExporting(false); }
  }
  return <>
    <PairPipelineNote />
    {runtime.scoreDistribution && <section className="tb3-status-summary" aria-label="Formula v1.1 numeric score distribution">{runtime.scoreDistribution.map((band) => <div key={band.label}><b>{band.count}</b><span>{band.label}</span></div>)}</section>}
    <div className="tb3-matrix-legend" aria-label="Numeric score bands, not Match thresholds"><span className="priority">61–100</span><span className="review">41–60</span><span className="missing">0–40 · inspect coverage</span></div>
    <section className="tb3-matrix-panel tb3-entity-grid-panel" data-table-format="entity-readiness-grid" data-pair-query="bounded-matrix"><header><div><span>Formula v1.1 · scoring only</span><h2>Evidence-aware pair scores</h2><p>Bounded pages or pinned partitions supply this window; the full pair universe is not loaded. A zero is a scored result; outside-scope and ineligible pairs remain explicitly separate.</p></div><div className="tb3-matrix-actions"><button disabled={loading || exporting || !page} onClick={() => exportPage("csv")}>Export this window CSV</button><button disabled={loading || exporting || !page} onClick={() => exportPage("xlsx")}>Export this window Excel</button></div></header>
      <div className="tb3-table-toolbar" role="group" aria-label="Match matrix controls"><label>Suppliers<input type="search" value={supplierQuery} placeholder="Filter suppliers" onChange={(event) => { setSupplierQuery(event.target.value); setSupplierPage(0); }} /></label><label>Tender filter<input type="search" value={tenderQuery} placeholder="Reference, country or object" onChange={(event) => { setTenderQuery(event.target.value); setTenderPage(0); }} /></label><label>Supplier sort<select value={supplierSort} onChange={(event) => { setSupplierSort(event.target.value); setSupplierPage(0); }}><option value="name-asc">Supplier A–Z</option><option value="name-desc">Supplier Z–A</option>{runtime.pairLeadersBySupplier && <option value="score-desc">Highest overall score</option>}</select></label><label>Supplier rows<select value={supplierLimit} onChange={(event) => { setSupplierLimit(Number(event.target.value)); setSupplierPage(0); }}>{[10, 25].map((value) => <option key={value}>{value}</option>)}</select></label><label>Tender columns<select value={tenderLimit} onChange={(event) => { setTenderLimit(Number(event.target.value)); setTenderPage(0); }}>{[4, 8].map((value) => <option key={value}>{value}</option>)}</select></label><span>{supplierRows.length} suppliers × {tenderRows.length} tenders · window up to {supplierLimit} × {tenderLimit}</span></div>
      <PageState loading={loading} error={error} />{exportError && <p role="alert">{exportError}</p>}
      <div className="tb3-matrix-scroll" role="region" aria-label="Full supplier by tender score matrix"><div className="tb3-matrix-table tb3-entity-matrix" role="grid" aria-rowcount={supplierRows.length + 1} aria-colcount={tenderRows.length + 1} style={{ minWidth: `${220 + visibleTenders.length * 100}px` }}><div className="tb3-matrix-header" role="row" style={{ gridTemplateColumns: `220px repeat(${visibleTenders.length}, 100px)` }}><div role="columnheader">Supplier / readiness</div>{visibleTenders.map((entry) => <div role="columnheader" key={entry.id} title={entry.title}><b>{entry.reference}</b><small>{entry.country}</small><em>{label(entry.object)}</em></div>)}</div>{visibleSuppliers.map((supplier) => <div className="tb3-matrix-row" role="row" key={supplier.id} style={{ gridTemplateColumns: `220px repeat(${visibleTenders.length}, 100px)` }}><div className="tb3-matrix-company" role="rowheader"><p><b>{supplier.legalEnglishName}</b><small>{supplier.readiness.label}</small></p></div>{visibleTenders.map((tender) => { const pair = byKey.get(`${tender.id}::${supplier.id}`); return <button role="gridcell" className={`tb3-matrix-cell ${scoreBand(pair?.pairScore ?? null)}`} disabled={loading || !pair} key={tender.id} onClick={() => onOpen(supplier.id, tender.id)} aria-label={`Open ${supplier.legalEnglishName} and ${tender.reference}; ${pair?.pairScore === null ? label(pair.mainLimitation) : `Pair Score ${metric(pair?.pairScore)}`}`}><b>{metric(pair?.pairScore)}</b><span>{pair ? scopeLabel(pair) : "Not loaded"}</span></button>; })}</div>)}</div></div>
      <div className="tb3-table-pager"><button disabled={supplierPage === 0} onClick={() => setSupplierPage((value) => value - 1)}>Previous suppliers</button><span>Supplier page {supplierPage + 1}</span><button disabled={(supplierPage + 1) * supplierLimit >= supplierRows.length} onClick={() => setSupplierPage((value) => value + 1)}>Next suppliers</button><button disabled={tenderPage === 0} onClick={() => setTenderPage((value) => value - 1)}>Previous tenders</button><span>Tender page {tenderPage + 1}</span><button disabled={(tenderPage + 1) * tenderLimit >= tenderRows.length} onClick={() => setTenderPage((value) => value + 1)}>Next tenders</button></div>
    </section>
  </>;
}

export function PagedPairRanking({ runtime, view, tender, supplier, suppliers, result, caseResults, onOpen, onFocus, children }: { runtime: TenderMatchRuntimeCatalog; view: "match-tenders" | "match-suppliers"; tender: TenderRecord; supplier: SupplierRecord; suppliers: SupplierRecord[]; result: TenderMatchCaseResult; caseResults: Record<string, TenderMatchCaseResult>; onOpen: OpenPair; onFocus: (query: { supplierId?: string; tenderId?: string }) => void; children: ReactNode }) {
  const [selectorQuery, setSelectorQuery] = useState("");
  const [rankingQuery, setRankingQuery] = useState("");
  const [sort, setSort] = useState<PairQuery["sort"]>("pairScore");
  const [limit, setLimit] = useState(25);
  const [cursors, setCursors] = useState<string[]>([""]);
  const query: PairQuery = { ...(view === "match-tenders" ? { tenderId: tender.id } : { supplierId: supplier.id }), sort, q: rankingQuery, limit, cursor: cursors.at(-1) };
  const { page, loading, error } = usePairPage(runtime, query);
  const selectorRecords = view === "match-tenders" ? runtimeTenders.filter((entry) => `${entry.reference} ${entry.title}`.toLowerCase().includes(selectorQuery.toLowerCase())) : suppliers.filter((entry) => entry.legalEnglishName.toLowerCase().includes(selectorQuery.toLowerCase()));
  function decision(pair: TenderMatchCompactPair) { return caseResults[keyOf(pair)]?.match.consultantDecision ?? pair.humanDisposition ?? "pending"; }
  return <><PairPipelineNote /><section className="tb3-match-workspace" data-pair-query="focused-ranking">
    <aside className="tb3-picker tb3-compact-picker" data-density="compact"><header><span>{view === "match-tenders" ? "Tenders" : "Suppliers"}</span><b>{selectorRecords.length} records</b><input type="search" aria-label="Filter selected inventory" value={selectorQuery} onChange={(event) => setSelectorQuery(event.target.value)} /></header>{view === "match-tenders" ? (selectorRecords as TenderRecord[]).map((entry) => <button key={entry.id} aria-pressed={entry.id === tender.id} className={`tb3-picker-row tb3-picker-tender${entry.id === tender.id ? " active" : ""}`} onClick={() => onFocus({ tenderId: entry.id })}><b>{entry.reference}</b><p title={entry.title}>{entry.title}</p><small>{entry.country}</small></button>) : (selectorRecords as SupplierRecord[]).map((entry) => <button key={entry.id} aria-pressed={entry.id === supplier.id} className={`tb3-picker-row tb3-picker-supplier${entry.id === supplier.id ? " active" : ""}`} onClick={() => onFocus({ supplierId: entry.id })}><span>{entry.profile?.countryCode}</span><p><b>{entry.legalEnglishName}</b><small>{supplierActivity(entry)} · {entry.readiness.label}</small></p></button>)}</aside>
    <article className="tb3-ranking"><header><div><span>{view === "match-tenders" ? tender.sourceLabel : "Selected supplier"}</span><h2>{view === "match-tenders" ? tender.title : supplier.legalEnglishName}</h2><p>{view === "match-tenders" ? `${tender.buyer} · ${tender.country}` : supplier.readiness.label}</p></div></header>
      <div className="tb3-table-toolbar" role="group" aria-label="Pair ranking table controls"><label>Search<input type="search" aria-label="Filter pair results" value={rankingQuery} onChange={(event) => { setRankingQuery(event.target.value); setCursors([""]); }} /></label><label>Sort<select value={sort} onChange={(event) => { setSort(event.target.value as PairQuery["sort"]); setCursors([""]); }}><option value="pairScore">Pair Score</option><option value="retrievalScore">Retrieval relevance</option><option value="dataCoverage">Data Coverage</option></select></label><label>Rows<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setCursors([""]); }}>{[25, 50, 100].map((value) => <option key={value}>{value}</option>)}</select></label><span>{page?.total ?? "—"} pair records</span></div>
      {page?.retrieval && <p className="tb3-pair-pipeline" data-retrieval-provenance="rank-only">Retrieval relevance is reciprocal-rank fusion, not a percentage or Pair Score. Semantic embeddings: {label(page.retrieval.semanticState)}. Lexical and taxonomy ranks remain independent of Formula v1.1.</p>}
      <PageState loading={loading} error={error} /><div className="tb3-data-table-scroll"><table className="tb3-data-table tb3-entity-grid tb3-ranking-table" data-table-format="entity-readiness-grid"><thead><tr><th scope="col" className="sticky-column">{view === "match-tenders" ? "Supplier" : "Tender"}</th><th scope="col">Readiness</th><th scope="col" className="numeric">Pair Score</th><th scope="col" className="numeric">Data Coverage</th><th scope="col" className="numeric">Evidence Confidence</th><th scope="col" className="numeric">Retrieval relevance</th><th scope="col">Main limitation / scope</th><th scope="col">Full TORS/AI</th><th scope="col">Human disposition</th><th scope="col">Action</th></tr></thead><tbody>{page?.items.map((pair) => { const rowSupplier = suppliers.find((entry) => entry.id === pair.supplierId), rowTender = runtimeTenders.find((entry) => entry.id === pair.tenderId); return <tr key={keyOf(pair)} className={keyOf(pair) === result.match.key ? "selected" : ""}><th scope="row" className="sticky-column"><button className="tb3-table-primary" onClick={() => onOpen(pair.supplierId, pair.tenderId)}><b>{view === "match-tenders" ? rowSupplier?.legalEnglishName ?? pair.supplierId : rowTender?.title ?? pair.tenderId}</b><span>{view === "match-tenders" ? rowSupplier?.profile?.countryCode : rowTender?.reference}</span></button></th><td>{rowSupplier?.readiness.label ?? "Unknown"}</td><td className="numeric"><b className={`tb3-score-text ${scoreBand(pair.pairScore)}`}>{metric(pair.pairScore)}</b></td><td className="numeric">{metric(pair.dataCoverage, true)}</td><td className="numeric">{metric(pair.evidenceConfidence, true)}</td><td className="numeric">{retrievalScoreLabel(pair.retrievalScore)}</td><td><span>{label(pair.eligibility.state)}</span><small>{label(pair.mainLimitation)}</small></td><td>{label(pair.assessmentState ?? "not escalated")}</td><td>{label(decision(pair))}</td><td><button className="tb3-table-action" onClick={() => onOpen(pair.supplierId, pair.tenderId)}>Review</button></td></tr>; })}</tbody></table></div>
      {!loading && !error && page?.items.length === 0 && <p className="tb3-table-empty">No pair records match these filters.</p>}
      <div className="tb3-table-pager"><span>{page ? `${page.offset + (page.items.length ? 1 : 0)}–${page.offset + page.items.length} of ${page.total}` : "Loading page"}</span><button disabled={loading || cursors.length <= 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Previous</button><span>Page {cursors.length}</span><button disabled={loading || !page?.nextCursor} onClick={() => setCursors((current) => [...current, page!.nextCursor!])}>Next</button></div>
    </article><div className="tb3-selected-pair-column">{children}<SelectedPairAssessment key={result.match.key} runtime={runtime} supplierId={supplier.id} tenderId={tender.id} /></div>
  </section></>;
}

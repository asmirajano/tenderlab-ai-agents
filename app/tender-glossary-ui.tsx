"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  contextualGlossaryTermsByPath,
  scoreTenderGlossaryTerm,
  tenderGlossaryCategoryLabels,
  tenderGlossaryTerms,
  type TenderGlossaryCategory,
  type TenderGlossaryTerm,
} from "./tender-glossary";

const categories = Object.entries(tenderGlossaryCategoryLabels) as Array<[TenderGlossaryCategory, string]>;

type LinkedSegment = { text: string; term?: TenderGlossaryTerm };

function splitGlossaryReferences(text: string, currentTerm: string): LinkedSegment[] {
  const candidates = tenderGlossaryTerms
    .filter((item) => item.term !== currentTerm)
    .sort((left, right) => right.term.length - left.term.length);
  const lowerText = text.toLocaleLowerCase("en-US");
  const matches: Array<{ start: number; end: number; term: TenderGlossaryTerm }> = [];

  for (const candidate of candidates) {
    const variants = [candidate.term]
      .filter((variant) => variant.length >= 4)
      .sort((left, right) => right.length - left.length);
    for (const variant of variants) {
      const needle = variant.toLocaleLowerCase("en-US");
      let index = lowerText.indexOf(needle);
      while (index >= 0) {
        const end = index + needle.length;
        const before = index === 0 ? " " : lowerText[index - 1];
        const after = end === lowerText.length ? " " : lowerText[end];
        const boundary = !/[a-zа-яё0-9]/i.test(before) && !/[a-zа-яё0-9]/i.test(after);
        const overlaps = matches.some((match) => index < match.end && end > match.start);
        if (boundary && !overlaps) matches.push({ start: index, end, term: candidate });
        index = lowerText.indexOf(needle, index + needle.length);
      }
    }
  }

  matches.sort((left, right) => left.start - right.start || right.end - left.end);
  const segments: LinkedSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start) });
    segments.push({ text: text.slice(match.start, match.end), term: match.term });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length ? segments : [{ text }];
}

function GlossaryLinkedText({ text, currentTerm, onNavigate }: { text: string; currentTerm: string; onNavigate: (term: TenderGlossaryTerm) => void }) {
  return (
    <>
      {splitGlossaryReferences(text, currentTerm).map((segment, index) => segment.term ? (
        <button className="tender-glossary-reference" key={`${segment.term.term}-${index}`} onClick={() => onNavigate(segment.term!)} type="button">
          {segment.text}
        </button>
      ) : <span key={`text-${index}`}>{segment.text}</span>)}
    </>
  );
}

function GlossaryDetail({ item, onClose, onNavigate, compact = false }: {
  item: TenderGlossaryTerm;
  onClose: () => void;
  onNavigate: (term: TenderGlossaryTerm) => void;
  compact?: boolean;
}) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Объяснение", value: item.explanation },
    { label: "Простыми словами", value: item.simpleExplanation },
    { label: "Пример TenderLab", value: item.example },
    { label: "Не путайте с…", value: item.notToConfuseWith },
  ];

  return (
    <article className={`tender-glossary-detail ${compact ? "is-compact" : ""}`}>
      <header>
        <div>
          <span>{tenderGlossaryCategoryLabels[item.category]}</span>
          <h2 id={compact ? undefined : "tender-glossary-detail-title"} lang="en">{item.term}</h2>
          <p>{item.translation}</p>
        </div>
        <button aria-label="Закрыть карточку термина" className="tender-glossary-close" onClick={onClose} type="button">×</button>
      </header>
      {item.aliases?.length ? <p className="tender-glossary-aliases">Также ищут: {item.aliases.join(" · ")}</p> : null}
      <div className="tender-glossary-detail-fields">
        {fields.map((field) => (
          <section key={field.label}>
            <strong>{field.label}</strong>
            <p><GlossaryLinkedText currentTerm={item.term} onNavigate={onNavigate} text={field.value} /></p>
          </section>
        ))}
      </div>
    </article>
  );
}

export function TenderGlossaryBrowser({ contextTerms = [] }: { contextTerms?: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TenderGlossaryCategory | "all">("all");
  const [selected, setSelected] = useState<TenderGlossaryTerm | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contextSet = useMemo(() => new Set(contextTerms), [contextTerms]);

  const visible = useMemo(() => tenderGlossaryTerms
    .map((item) => ({ item, score: scoreTenderGlossaryTerm(item, query), contextual: contextSet.has(item.term) }))
    .filter((result) => result.score > 0 && (category === "all" || result.item.category === category))
    .sort((left, right) => Number(right.contextual) - Number(left.contextual) || right.score - left.score || left.item.term.localeCompare(right.item.term)),
  [category, contextSet, query]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const closeSelected = useCallback(() => {
    setSelected(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }, []);

  const openSelected = (item: TenderGlossaryTerm, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setSelected(item);
  };

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSelected, selected]);

  const controls = (
    <>
      <label className="tender-glossary-search">
        <span>⌕</span>
        <input
          aria-label="Поиск по TenderLab Glossary"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Термин или смысл"
          ref={searchRef}
          type="search"
          value={query}
        />
      </label>
      <div aria-label="Фильтр терминов по категории" className="tender-glossary-filters" role="group">
        <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button">Все <b>{tenderGlossaryTerms.length}</b></button>
        {categories.map(([id, label]) => (
          <button aria-pressed={category === id} key={id} onClick={() => setCategory(id)} type="button">
            {label} <b>{tenderGlossaryTerms.filter((item) => item.category === id).length}</b>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="tender-glossary-panel-browser">
      {controls}
      <div className="tender-glossary-result-meta">
        <span><b>{visible.length}</b> совпадений</span>
        <span><b>{visible.filter((result) => result.contextual).length}</b> по текущей странице</span>
      </div>
      <div className="tender-glossary-panel-list">
        {visible.map(({ item, contextual }) => (
          <button className="tender-glossary-panel-item" key={item.term} onClick={(event) => openSelected(item, event.currentTarget)} type="button">
            <span>{tenderGlossaryCategoryLabels[item.category]}{contextual ? " · В контексте" : ""}</span>
            <strong lang="en">{item.term}</strong>
            <p>{item.translation}</p>
          </button>
        ))}
        {!visible.length ? <p className="tender-glossary-empty">Термин не найден. Попробуйте роль, процесс, результат или русское объяснение.</p> : null}
      </div>
      {selected ? (
        <div className="tender-glossary-panel-detail">
          <GlossaryDetail compact item={selected} onClose={closeSelected} onNavigate={setSelected} />
        </div>
      ) : null}
    </div>
  );
}

export function TenderGlossaryShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const contextTerms = open && typeof window !== "undefined"
    ? contextualGlossaryTermsByPath[window.location.pathname] ?? []
    : [];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => openerRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  };

  return (
    <>
      {children}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`tender-glossary-edge-tab ${open ? "is-open" : ""}`}
        onClick={() => setOpen(true)}
        ref={openerRef}
        type="button"
      >
        <span lang="en">Glossary</span><b>{tenderGlossaryTerms.length}</b>
      </button>
      {open ? (
        <div className="tender-glossary-layer">
          <button aria-label="Закрыть TenderLab Glossary" className="tender-glossary-backdrop" onClick={close} type="button" />
          <aside aria-labelledby="tender-glossary-panel-title" aria-modal="true" className="tender-glossary-panel" role="dialog">
            <header>
              <div>
                <span>TENDERLAB KNOWLEDGE</span>
                <h2 id="tender-glossary-panel-title">TenderLab Glossary</h2>
                <p>Быстрые определения в контексте текущей страницы.</p>
              </div>
              <button aria-label="Закрыть TenderLab Glossary" className="tender-glossary-close" onClick={close} type="button">×</button>
            </header>
            <TenderGlossaryBrowser contextTerms={contextTerms} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

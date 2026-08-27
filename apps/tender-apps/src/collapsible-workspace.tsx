import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RegisteredSection = {
  contentId: string;
  defaultExpanded: boolean;
  expanded: boolean;
  focusActive: boolean;
  label: string;
  primary: boolean;
};

type WorkspaceContextValue = {
  sections: Record<string, RegisteredSection>;
  registerSection: (sectionId: string, section: Omit<RegisteredSection, "expanded" | "focusActive">) => void;
  unregisterSection: (sectionId: string) => void;
  setExpanded: (sectionId: string, expanded: boolean) => void;
  setAllExpanded: (expanded: boolean) => void;
  focusSection: (sectionId: string) => void;
  exitFocus: (sectionId: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Collapsible workspace controls must be used inside CollapsibleWorkspaceProvider");
  return context;
}

export function CollapsibleWorkspaceProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<Record<string, RegisteredSection>>({});

  const registerSection = useCallback((sectionId: string, section: Omit<RegisteredSection, "expanded" | "focusActive">) => {
    setSections((current) => {
      const existing = current[sectionId];
      if (existing
        && existing.contentId === section.contentId
        && existing.label === section.label
        && existing.primary === section.primary) return current;
      return {
        ...current,
        [sectionId]: {
          ...section,
          expanded: existing?.expanded ?? section.defaultExpanded,
          focusActive: existing?.focusActive ?? false,
        },
      };
    });
  }, []);

  const unregisterSection = useCallback((sectionId: string) => {
    setSections((current) => {
      if (!current[sectionId]) return current;
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  }, []);

  const setExpanded = useCallback((sectionId: string, expanded: boolean) => {
    setSections((current) => current[sectionId]
      ? { ...current, [sectionId]: { ...current[sectionId], expanded, focusActive: expanded ? current[sectionId].focusActive : false } }
      : current);
  }, []);

  const setAllExpanded = useCallback((expanded: boolean) => {
    setSections((current) => Object.fromEntries(
      Object.entries(current).map(([sectionId, section]) => [sectionId, { ...section, expanded, focusActive: expanded ? section.focusActive : false }]),
    ));
  }, []);

  const focusSection = useCallback((sectionId: string) => {
    setSections((current) => Object.fromEntries(Object.entries(current).map(([candidateId, section]) => [
      candidateId,
      candidateId === sectionId
        ? { ...section, expanded: true, focusActive: true }
        : { ...section, focusActive: false },
    ])));
  }, []);

  const exitFocus = useCallback((sectionId: string) => {
    setSections((current) => current[sectionId]
      ? { ...current, [sectionId]: { ...current[sectionId], focusActive: false } }
      : current);
  }, []);

  const value = useMemo(() => ({
    sections,
    registerSection,
    unregisterSection,
    setExpanded,
    setAllExpanded,
    focusSection,
    exitFocus,
  }), [exitFocus, focusSection, registerSection, sections, setAllExpanded, setExpanded, unregisterSection]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function WorkspaceGlobalControls() {
  const { focusSection, sections, setAllExpanded } = useWorkspaceContext();
  const registered = Object.entries(sections);
  const allExpanded = registered.length > 0 && registered.every(([, section]) => section.expanded);
  const primary = registered.find(([, section]) => section.primary) ?? registered[0];
  const controlledIds = registered.map(([, section]) => section.contentId).join(" ") || undefined;

  return (
    <nav aria-label="Result workspace display controls" className="bs-workspace-controls">
      <div>
        <span>WORKSPACE CONTROLS</span>
        <b>{registered.length} result section{registered.length === 1 ? "" : "s"}</b>
        <small>Expand the workspace or isolate its primary output.</small>
      </div>
      <div>
        <button
          aria-controls={controlledIds}
          disabled={!registered.length}
          onClick={() => setAllExpanded(!allExpanded)}
          type="button"
        >
          <span aria-hidden="true">{allExpanded ? "−" : "+"}</span>
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <button
          aria-controls={primary?.[1].contentId}
          disabled={!primary}
          onClick={() => primary && focusSection(primary[0])}
          type="button"
        >
          <span aria-hidden="true">⛶</span>
          Focus primary output
        </button>
      </div>
    </nav>
  );
}

type CollapsibleWorkspaceSectionProps = {
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultExpanded?: boolean;
  description?: ReactNode;
  eyebrow: string;
  primary?: boolean;
  sectionId: string;
  title: string;
};

export const CollapsibleWorkspaceSection = forwardRef<HTMLElement, CollapsibleWorkspaceSectionProps>(function CollapsibleWorkspaceSection({
  aside,
  children,
  className = "",
  contentClassName = "",
  defaultExpanded = true,
  description,
  eyebrow,
  primary = false,
  sectionId,
  title,
}, forwardedRef) {
  const {
    exitFocus,
    focusSection,
    registerSection,
    sections,
    setExpanded: setRegisteredExpanded,
    unregisterSection,
  } = useWorkspaceContext();
  const contentId = `${sectionId}-content`;
  const titleId = `${sectionId}-title`;
  const registered = sections[sectionId];
  const expanded = registered?.expanded ?? defaultExpanded;
  const focusActive = registered?.focusActive ?? false;
  const focusButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerSection(sectionId, { contentId, defaultExpanded, label: title, primary });
    return () => unregisterSection(sectionId);
  }, [contentId, defaultExpanded, primary, registerSection, sectionId, title, unregisterSection]);

  const setExpanded = useCallback((nextExpanded: boolean) => {
    setRegisteredExpanded(sectionId, nextExpanded);
  }, [sectionId, setRegisteredExpanded]);

  const enterFocus = useCallback(() => {
    focusSection(sectionId);
  }, [focusSection, sectionId]);

  useEffect(() => {
    if (!focusActive) return undefined;
    const focusButton = focusButtonRef.current;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      exitFocus(sectionId);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      window.requestAnimationFrame(() => focusButton?.focus());
    };
  }, [exitFocus, focusActive, sectionId]);

  return (
    <section
      aria-labelledby={titleId}
      className={`bs-workspace-section ${expanded ? "is-expanded" : "is-collapsed"} ${focusActive ? "is-focus-mode" : ""} ${className}`.trim()}
      ref={forwardedRef}
    >
      <header className="bs-workspace-section-header">
        <div className="bs-workspace-section-title">
          <span>{eyebrow}</span>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="bs-workspace-section-actions">
          {aside && <div className="bs-workspace-section-aside">{aside}</div>}
          <button
            aria-controls={contentId}
            aria-expanded={expanded}
            className="bs-section-toggle"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <span>{expanded ? "Collapse" : "Expand"}</span>
            <i aria-hidden="true">{expanded ? "⌃" : "⌄"}</i>
          </button>
          <button
            aria-controls={contentId}
            aria-keyshortcuts={focusActive ? "Escape" : undefined}
            aria-label={focusActive ? `Exit Focus Mode for ${title}` : `Enter Focus Mode for ${title}`}
            aria-pressed={focusActive}
            className="bs-focus-mode-button"
            onClick={() => focusActive ? exitFocus(sectionId) : enterFocus()}
            ref={focusButtonRef}
            title={focusActive ? "Exit Focus Mode (Esc)" : `Focus on ${title}`}
            type="button"
          >
            <span aria-hidden="true">{focusActive ? "×" : "⛶"}</span>
            {focusActive ? "Exit Focus" : "Focus Mode"}
            {focusActive && <kbd>Esc</kbd>}
          </button>
        </div>
      </header>
      <div className={`bs-workspace-section-content ${contentClassName}`.trim()} hidden={!expanded} id={contentId}>
        {children}
      </div>
    </section>
  );
});

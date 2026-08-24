"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type CaseExpansionContextValue = {
  expandedCases: Record<string, boolean>;
  registerCase: (caseId: string, defaultExpanded: boolean) => void;
  unregisterCase: (caseId: string) => void;
  setCaseExpanded: (caseId: string, next: SetStateAction<boolean>) => void;
  setAllCasesExpanded: (expanded: boolean) => void;
};

const CaseExpansionContext = createContext<CaseExpansionContextValue | null>(null);

export function CaseExpansionProvider({ children }: { children: ReactNode }) {
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});

  const registerCase = useCallback((caseId: string, defaultExpanded: boolean) => {
    setExpandedCases((current) => caseId in current
      ? current
      : { ...current, [caseId]: defaultExpanded });
  }, []);

  const unregisterCase = useCallback((caseId: string) => {
    setExpandedCases((current) => {
      if (!(caseId in current)) return current;
      const next = { ...current };
      delete next[caseId];
      return next;
    });
  }, []);

  const setCaseExpanded = useCallback((caseId: string, next: SetStateAction<boolean>) => {
    setExpandedCases((current) => {
      const currentValue = current[caseId] ?? false;
      const nextValue = typeof next === "function"
        ? (next as (value: boolean) => boolean)(currentValue)
        : next;
      return currentValue === nextValue
        ? current
        : { ...current, [caseId]: nextValue };
    });
  }, []);

  const setAllCasesExpanded = useCallback((expanded: boolean) => {
    setExpandedCases((current) => Object.fromEntries(
      Object.keys(current).map((caseId) => [caseId, expanded]),
    ));
  }, []);

  return (
    <CaseExpansionContext.Provider value={{
      expandedCases,
      registerCase,
      unregisterCase,
      setCaseExpanded,
      setAllCasesExpanded,
    }}>
      {children}
    </CaseExpansionContext.Provider>
  );
}

function useCaseExpansionContext() {
  const context = useContext(CaseExpansionContext);
  if (!context) throw new Error("Case expansion controls must be used inside CaseExpansionProvider.");
  return context;
}

export function useCaseExpansion(caseId: string, defaultExpanded = false): [boolean, Dispatch<SetStateAction<boolean>>] {
  const { expandedCases, registerCase, setCaseExpanded, unregisterCase } = useCaseExpansionContext();

  useEffect(() => {
    registerCase(caseId, defaultExpanded);
    return () => unregisterCase(caseId);
  }, [caseId, defaultExpanded, registerCase, unregisterCase]);

  const setExpanded = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next) => setCaseExpanded(caseId, next),
    [caseId, setCaseExpanded],
  );

  return [expandedCases[caseId] ?? defaultExpanded, setExpanded];
}

export function useAllCaseExpansion() {
  const { expandedCases, setAllCasesExpanded } = useCaseExpansionContext();
  const caseIds = Object.keys(expandedCases);
  const expandedCount = caseIds.filter((caseId) => expandedCases[caseId]).length;

  return {
    allExpanded: caseIds.length > 0 && expandedCount === caseIds.length,
    caseCount: caseIds.length,
    caseIds,
    expandedCount,
    setAllCasesExpanded,
  };
}

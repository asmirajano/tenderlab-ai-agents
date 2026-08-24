"use client";

import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef, useState } from "react";

export function useSectionFocusMode(expanded: boolean, setExpanded: Dispatch<SetStateAction<boolean>>) {
  const [active, setActive] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!expanded) setActive(false);
  }, [expanded]);

  useEffect(() => {
    if (!active) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActive(false);
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  const toggle = () => {
    if (!active) setExpanded(true);
    setActive((current) => !current);
  };
  return { active, buttonRef, toggle };
}

export function SectionFocusButton({ active, buttonRef, onClick, dark = false }: { active: boolean; buttonRef: RefObject<HTMLButtonElement | null>; onClick: () => void; dark?: boolean }) {
  return <button ref={buttonRef} type="button" className={`case-focus-button${dark ? " is-dark" : ""}`} aria-label={active ? "Выйти из Focus Mode" : "Открыть секцию в Focus Mode"} aria-pressed={active} onClick={onClick} title={active ? "Выйти из Focus Mode (Esc)" : "Открыть на весь экран"}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d={active ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"} /></svg>
    <b>{active ? "Свернуть" : "Focus mode"}</b>{active ? <small>Esc</small> : null}
  </button>;
}

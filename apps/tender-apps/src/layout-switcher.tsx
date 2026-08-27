import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type LayoutMode = "standard" | "wide";

export const LAYOUT_STORAGE_KEY = "tenderapps:layout-mode";

function readLayoutMode(): LayoutMode {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY) === "wide" ? "wide" : "standard";
  } catch {
    return "standard";
  }
}

export function useLayoutPreference() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(readLayoutMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch {
      // The preference remains available for this page when browser storage is unavailable.
    }
  }, [layoutMode]);

  useEffect(() => {
    const syncLayoutMode = (event: StorageEvent) => {
      if (event.key === LAYOUT_STORAGE_KEY) {
        setLayoutMode(event.newValue === "wide" ? "wide" : "standard");
      }
    };

    window.addEventListener("storage", syncLayoutMode);
    return () => window.removeEventListener("storage", syncLayoutMode);
  }, []);

  return [layoutMode, setLayoutMode] as const;
}

type LayoutSwitcherProps = {
  value: LayoutMode;
  onChange: (value: LayoutMode) => void;
};

export function LayoutSwitcher({ value, onChange }: LayoutSwitcherProps) {
  const standardButton = useRef<HTMLButtonElement>(null);
  const wideButton = useRef<HTMLButtonElement>(null);

  const selectMode = (mode: LayoutMode, focus = false) => {
    onChange(mode);
    if (focus) (mode === "wide" ? wideButton : standardButton).current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      selectMode("standard", true);
    }
    if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      selectMode("wide", true);
    }
  };

  return (
    <div
      aria-label="Workspace layout width"
      className="client-layout-switcher"
      role="group"
      title="Wide expands the workspace on large screens; responsive limits still apply on smaller screens."
    >
      <div className="client-layout-options">
        <button ref={standardButton} aria-pressed={value === "standard"} onClick={() => selectMode("standard")} onKeyDown={handleKeyDown} type="button">
          Standard
        </button>
        <button ref={wideButton} aria-pressed={value === "wide"} onClick={() => selectMode("wide")} onKeyDown={handleKeyDown} type="button">
          Wide
        </button>
      </div>
    </div>
  );
}

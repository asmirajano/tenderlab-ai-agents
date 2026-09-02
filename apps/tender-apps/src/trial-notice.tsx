import { useEffect, useState } from "react";
import "./trial-notice.css";

type TrialNoticeProduct = "balance" | "logistics" | "match";
type TrialNoticePhase = "entering" | "visible" | "exiting" | "hidden";

export const trialNoticeTiming = {
  entranceDelayMs: 30,
  entranceDurationMs: 420,
  visibleDurationMs: 5_000,
  exitDurationMs: 480,
} as const;

const shownDuringThisPageLoad = new Set<string>();

export function TrialNotice({ product, productId }: { product: TrialNoticeProduct; productId: string }) {
  const [eligible] = useState(() => !shownDuringThisPageLoad.has(productId));
  const [phase, setPhase] = useState<TrialNoticePhase>(() => eligible ? "entering" : "hidden");

  useEffect(() => {
    if (!eligible) return;

    shownDuringThisPageLoad.add(productId);
    const visibleAt = trialNoticeTiming.entranceDelayMs;
    const exitAt = visibleAt + trialNoticeTiming.entranceDurationMs + trialNoticeTiming.visibleDurationMs;
    const hiddenAt = exitAt + trialNoticeTiming.exitDurationMs;
    const showTimer = window.setTimeout(() => setPhase("visible"), visibleAt);
    const exitTimer = window.setTimeout(() => setPhase("exiting"), exitAt);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), hiddenAt);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [eligible, productId]);

  if (phase === "hidden") return null;

  return (
    <aside
      aria-atomic="true"
      aria-live="polite"
      className={`trial-notice is-${phase}`}
      data-product={product}
      data-testid="trial-notice"
      role="status"
    >
      <strong className="trial-notice__title">3 free uses</strong>
      <p>You can use this service <b>3 times for free</b>.</p>
      <p>After that, usage will be based on your <b>TenderApps Plan</b>.</p>
      <span className="trial-notice__plan">View Plan</span>
    </aside>
  );
}

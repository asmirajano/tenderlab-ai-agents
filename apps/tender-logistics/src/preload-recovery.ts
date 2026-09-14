const RECOVERY_AT_KEY = "tenderapps:preload-recovery-at:v1";
const RECOVERY_NOTICE_KEY = "tenderapps:preload-recovery-notice:v1";
const RECOVERY_COOLDOWN_MS = 30_000;

export function shouldReloadAfterPreloadFailure(lastRecoveryAt: string | null, now = Date.now()) {
  const previous = Number(lastRecoveryAt ?? 0);
  return !Number.isFinite(previous) || previous <= 0 || now - previous > RECOVERY_COOLDOWN_MS;
}

export function installVitePreloadRecovery() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const now = Date.now();
    if (!shouldReloadAfterPreloadFailure(window.sessionStorage.getItem(RECOVERY_AT_KEY), now)) return;
    window.sessionStorage.setItem(RECOVERY_AT_KEY, String(now));
    window.sessionStorage.setItem(RECOVERY_NOTICE_KEY, "TenderApps was updated while this page was open. The latest version is ready; please choose your documents again.");
    window.location.reload();
  });
}

export function consumePreloadRecoveryNotice() {
  if (typeof window === "undefined") return "";
  const notice = window.sessionStorage.getItem(RECOVERY_NOTICE_KEY) ?? "";
  if (notice) window.sessionStorage.removeItem(RECOVERY_NOTICE_KEY);
  return notice;
}

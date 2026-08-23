"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseClientServices } from "./firebase-client";

export type AgentReviewStatus = "understood" | "in-progress" | "unclear";
export type AgentReviewFilter = "all" | AgentReviewStatus | "unreviewed";
export type WorkspaceSyncState = "initializing" | "signed-out" | "loading" | "saving" | "synced" | "offline" | "error";

export type AgentWorkingState = {
  agentId: number;
  canonicalRegistryId: string;
  reviewStatus?: AgentReviewStatus;
};

export const agentReviewOptions: Array<{
  id: AgentReviewFilter;
  label: string;
  shortLabel: string;
  mark: string;
}> = [
  { id: "all", label: "Все статусы", shortLabel: "Все", mark: "•" },
  { id: "understood", label: "Понятный", shortLabel: "Понятный", mark: "✓" },
  { id: "in-progress", label: "Работаю над ним", shortLabel: "В работе", mark: "↻" },
  { id: "unclear", label: "Непонятный", shortLabel: "Непонятный", mark: "?" },
  { id: "unreviewed", label: "Не оценён", shortLabel: "Не оценён", mark: "○" },
];

export const agentReviewMeta = Object.fromEntries(
  agentReviewOptions.filter((option) => option.id !== "all").map((option) => [option.id, option]),
) as Record<Exclude<AgentReviewFilter, "all">, (typeof agentReviewOptions)[number]>;

type AgentWorkspaceContextValue = {
  user: User | null;
  states: Record<number, AgentWorkingState>;
  syncState: WorkspaceSyncState;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateReviewStatus: (agentId: number, canonicalRegistryId: string, status?: AgentReviewStatus) => Promise<void>;
};

const AgentWorkspaceContext = createContext<AgentWorkspaceContextValue | null>(null);

function isReviewStatus(value: unknown): value is AgentReviewStatus {
  return value === "understood" || value === "in-progress" || value === "unclear";
}

function readableFirebaseError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("popup-closed-by-user")) return "Вход отменён.";
  if (code.includes("network-request-failed")) return "Нет соединения. Проверьте интернет и повторите.";
  if (code.includes("permission-denied")) return "Доступ к рабочему состоянию запрещён правилами Firebase.";
  return error instanceof Error ? error.message : "Не удалось синхронизировать рабочее состояние.";
}

export function AgentWorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [states, setStates] = useState<Record<number, AgentWorkingState>>({});
  const [syncState, setSyncState] = useState<WorkspaceSyncState>("initializing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const services = getFirebaseClientServices();
    if (!services) return;

    let active = true;
    let stopWorkspace = () => {};
    const handleOffline = () => setSyncState("offline");
    const handleOnline = () => setSyncState((current) => current === "offline" ? (services.auth.currentUser ? "loading" : "signed-out") : current);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    void setPersistence(services.auth, browserLocalPersistence)
      .then(() => getRedirectResult(services.auth))
      .catch((redirectError) => {
        if (!active) return;
        setError(readableFirebaseError(redirectError));
        setSyncState("error");
      });

    const stopAuth = onAuthStateChanged(services.auth, (nextUser) => {
      stopWorkspace();
      stopWorkspace = () => {};
      setUser(nextUser);
      setError(null);

      if (!nextUser) {
        setStates({});
        setSyncState("signed-out");
        return;
      }

      setSyncState(navigator.onLine ? "loading" : "offline");
      const workspace = collection(services.db, "users", nextUser.uid, "agentReview");
      stopWorkspace = onSnapshot(workspace, { includeMetadataChanges: true }, (snapshot) => {
        const nextStates: Record<number, AgentWorkingState> = {};
        for (const item of snapshot.docs) {
          const data = item.data();
          const agentId = Number(data.agentId);
          if (!Number.isInteger(agentId) || agentId < 1 || agentId > 64) continue;
          nextStates[agentId] = {
            agentId,
            canonicalRegistryId: String(data.canonicalRegistryId ?? item.id),
            reviewStatus: isReviewStatus(data.reviewStatus) ? data.reviewStatus : undefined,
          };
        }
        setStates(nextStates);
        setSyncState(snapshot.metadata.hasPendingWrites ? "saving" : navigator.onLine ? "synced" : "offline");
      }, (snapshotError) => {
        setError(readableFirebaseError(snapshotError));
        setSyncState("error");
      });
    });

    return () => {
      active = false;
      stopWorkspace();
      stopAuth();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const signIn = useCallback(async () => {
    const services = getFirebaseClientServices();
    if (!services) return;
    setError(null);
    setSyncState("loading");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(services.auth, provider);
    } catch (signInError) {
      const code = typeof signInError === "object" && signInError && "code" in signInError ? String(signInError.code) : "";
      if (code.includes("popup-blocked")) {
        await signInWithRedirect(services.auth, provider);
        return;
      }
      setError(readableFirebaseError(signInError));
      setSyncState("error");
    }
  }, []);

  const signOut = useCallback(async () => {
    const services = getFirebaseClientServices();
    if (!services) return;
    await firebaseSignOut(services.auth);
  }, []);

  const updateReviewStatus = useCallback(async (
    agentId: number,
    canonicalRegistryId: string,
    status?: AgentReviewStatus,
  ) => {
    const services = getFirebaseClientServices();
    if (!services || !user) {
      setError("Войдите через Google, чтобы сохранить статус на всех устройствах.");
      return;
    }

    const previous = states[agentId];
    setStates((current) => ({
      ...current,
      [agentId]: { agentId, canonicalRegistryId, reviewStatus: status },
    }));
    setSyncState(navigator.onLine ? "saving" : "offline");
    setError(null);

    try {
      await setDoc(doc(services.db, "users", user.uid, "agentReview", canonicalRegistryId), {
        agentId,
        canonicalRegistryId,
        reviewStatus: status ?? deleteField(),
        schemaVersion: 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (writeError) {
      setStates((current) => {
        const next = { ...current };
        if (previous) next[agentId] = previous;
        else delete next[agentId];
        return next;
      });
      setError(readableFirebaseError(writeError));
      setSyncState("error");
    }
  }, [states, user]);

  const value = useMemo(() => ({
    user,
    states,
    syncState,
    error,
    signIn,
    signOut,
    updateReviewStatus,
  }), [error, signIn, signOut, states, syncState, updateReviewStatus, user]);

  return <AgentWorkspaceContext.Provider value={value}>{children}</AgentWorkspaceContext.Provider>;
}

export function useAgentWorkspace() {
  const value = useContext(AgentWorkspaceContext);
  if (!value) throw new Error("useAgentWorkspace must be used inside AgentWorkspaceProvider");
  return value;
}

export function reviewStatusFor(states: Record<number, AgentWorkingState>, agentId: number): Exclude<AgentReviewFilter, "all"> {
  return states[agentId]?.reviewStatus ?? "unreviewed";
}

export function AgentReviewBadge({ agentId, className = "" }: { agentId: number; className?: string }) {
  const { states, user } = useAgentWorkspace();
  const status = reviewStatusFor(states, agentId);
  const meta = agentReviewMeta[status];
  return <span className={`agent-review-badge status-${user ? status : "locked"} ${className}`.trim()}><i>{user ? meta.mark : "○"}</i>{user ? meta.shortLabel : "Workspace"}</span>;
}

export function AgentReviewControl({
  agentId,
  canonicalRegistryId,
  compact = false,
}: {
  agentId: number;
  canonicalRegistryId: string;
  compact?: boolean;
}) {
  const { states, user, signIn, updateReviewStatus } = useAgentWorkspace();
  const status = reviewStatusFor(states, agentId);

  if (!user) {
    return (
      <button className={`agent-review-login ${compact ? "is-compact" : ""}`.trim()} type="button" onClick={(event) => { event.stopPropagation(); void signIn(); }}>
        <i>○</i><span>{compact ? "Мой статус" : "Войти для статуса"}</span>
      </button>
    );
  }

  return (
    <label className={`agent-review-control status-${status} ${compact ? "is-compact" : ""}`.trim()}>
      <i>{agentReviewMeta[status].mark}</i>
      <span>{compact ? "MY STATUS" : "Мой статус"}</span>
      <select
        aria-label={`Личный рабочий статус Agent ${String(agentId).padStart(2, "0")}`}
        value={status}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const value = event.target.value;
          void updateReviewStatus(agentId, canonicalRegistryId, value === "unreviewed" ? undefined : value as AgentReviewStatus);
        }}
      >
        {agentReviewOptions.filter((option) => option.id !== "all").map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function AgentWorkspaceAccount() {
  const { user, syncState, error, signIn, signOut } = useAgentWorkspace();
  const syncLabels: Record<WorkspaceSyncState, string> = {
    initializing: "Подключение…",
    "signed-out": "Нужен вход",
    loading: "Загрузка…",
    saving: "Сохраняется…",
    synced: "Синхронизировано",
    offline: "Offline · изменения в очереди",
    error: "Ошибка синхронизации",
  };

  return (
    <div className={`agent-workspace-account state-${syncState}`}>
      <div><span>PERSONAL WORKSPACE</span><b>{user?.displayName || user?.email || "Cross-device review"}</b><small>{error ?? syncLabels[syncState]}</small></div>
      {user
        ? <button type="button" onClick={() => void signOut()}>Выйти</button>
        : <button type="button" onClick={() => void signIn()}>Войти через Google</button>}
    </div>
  );
}

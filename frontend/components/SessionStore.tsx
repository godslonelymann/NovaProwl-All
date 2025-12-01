"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type StoredSession = {
  id: string;
  title: string;
  firstPrompt: string;
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
  // optional: you can enrich later
  fileName?: string;
};

type SessionContextValue = {
  sessions: StoredSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createSession: (payload: {
    firstPrompt: string;
    fileName?: string;
  }) => StoredSession;
  updateSession: (
    id: string,
    patch: Partial<Omit<StoredSession, "id" | "createdAt">>
  ) => void;
  deleteSession: (id: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "novaprowl_sessions_v1";
const ACTIVE_KEY = "novaprowl_active_session";

function loadSessionsFromStorage(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: StoredSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function loadActiveFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

function saveActiveToStorage(id: string | null) {
  try {
    if (!id) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(
    null
  );

  // load on mount
  useEffect(() => {
    const stored = loadSessionsFromStorage();
    setSessions(stored);
    const active = loadActiveFromStorage();
    if (active && stored.some((s) => s.id === active)) {
      setActiveSessionIdState(active);
    }
  }, []);

  // persist sessions
  useEffect(() => {
    saveSessionsToStorage(sessions);
  }, [sessions]);

  // persist activeSessionId
  useEffect(() => {
    saveActiveToStorage(activeSessionId);
  }, [activeSessionId]);

  const setActiveSessionId = (id: string | null) => {
    setActiveSessionIdState(id);
  };

  const createSession: SessionContextValue["createSession"] = ({
    firstPrompt,
    fileName,
  }) => {
    const now = Date.now();
    const id = `sess_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const title = fileName
      ? `${firstPrompt.slice(0, 40)} – ${fileName}`
      : firstPrompt.slice(0, 60) || "Untitled session";

    const newSession: StoredSession = {
      id,
      title,
      firstPrompt,
      fileName,
      createdAt: now,
      updatedAt: now,
      lastMessage: firstPrompt,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionIdState(id);

    return newSession;
  };

  const updateSession: SessionContextValue["updateSession"] = (id, patch) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              updatedAt: Date.now(),
            }
          : s
      )
    );
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionIdState(null);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        activeSessionId,
        setActiveSessionId,
        createSession,
        updateSession,
        deleteSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionStore() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionStore must be used inside SessionProvider");
  return ctx;
}
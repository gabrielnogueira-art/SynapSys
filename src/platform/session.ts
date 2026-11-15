import { useEffect, useState } from "react";
import { PlatformUser } from "./types";

const SESSION_KEY = "gestao_viewer_session_v1";
const SESSION_EVENT = "platform-session-updated";

export type ViewerSession =
  | { mode: "owner" }
  | {
      mode: "client";
      userId: string;
      userName: string;
      userEmail: string;
      contractId: string;
      roleLabel: string;
    };

export function getViewerSession(): ViewerSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { mode: "owner" };
    const parsed = JSON.parse(raw) as ViewerSession;
    if (parsed && parsed.mode === "client" && parsed.contractId) {
      return parsed;
    }
    return { mode: "owner" };
  } catch {
    return { mode: "owner" };
  }
}

export function setViewerSession(next: ViewerSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function switchToOwnerMode() {
  setViewerSession({ mode: "owner" });
}

export function switchToClientSimulation(user: PlatformUser) {
  setViewerSession({
    mode: "client",
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    contractId: user.contractId,
    roleLabel: user.roleLabel,
  });
}

export function useViewerSession(): ViewerSession {
  const [session, setSession] = useState<ViewerSession>(() => getViewerSession());

  useEffect(() => {
    const sync = () => setSession(getViewerSession());
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}

export function canAccessContract(
  session: ViewerSession,
  contractId: string
): boolean {
  if (session.mode === "owner") return true;
  return session.contractId === contractId;
}

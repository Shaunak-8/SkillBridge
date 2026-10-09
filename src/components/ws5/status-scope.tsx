"use client";
import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { allowedNextStatuses, type ApplicationActor, type ApplicationStatus } from "@/lib/applications/status";
import { ApplicationStatusBadge } from "./parts";

const LABELS: Partial<Record<ApplicationStatus, string>> = { viewed: "Mark viewed", shortlisted: "Shortlist", accepted: "Accept", declined: "Decline", withdrawn: "Withdraw" };

interface Scope { status: ApplicationStatus; actor: ApplicationActor; pending: ApplicationStatus | null; error: string; move: (to: ApplicationStatus) => void }
const ScopeContext = createContext<Scope | null>(null);
const useScope = () => {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error("Status components must be rendered inside <ApplicationStatusScope>.");
  return scope;
};

/**
 * Holds one application's status for its badge and buttons. A click shows the new status immediately and
 * rolls back with a message if the server refuses, instead of waiting for the whole page to re-render.
 */
export function ApplicationStatusScope({ applicationId, status, actor, children }: { applicationId: string; status: ApplicationStatus; actor: ApplicationActor; children: React.ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [serverStatus, setServerStatus] = useState(status);
  const [pending, setPending] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  // A refresh can bring a different server value (another tab, the other party): follow it.
  if (status !== serverStatus) { setServerStatus(status); setCurrent(status); }

  async function move(to: ApplicationStatus) {
    const previous = current;
    setError(""); setPending(to); setCurrent(to);
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: to }) });
      if (res.ok) startTransition(() => router.refresh());
      else { setCurrent(previous); setError((await res.json().catch(() => null))?.error ?? "Could not update."); }
    } catch { setCurrent(previous); setError("Network error. Try again."); }
    finally { setPending(null); }
  }

  return <ScopeContext.Provider value={{ status: current, actor, pending, error, move }}>{children}</ScopeContext.Provider>;
}

export function LiveStatusBadge() {
  return <ApplicationStatusBadge status={useScope().status} />;
}

export function LiveStatusActions() {
  const { status, actor, pending, error, move } = useScope();
  const next = allowedNextStatuses(status, actor);
  if (!next.length && !error) return null;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => <Button key={s} disabled={pending !== null} onClick={() => move(s)} variant={s === "accepted" ? "primary" : "secondary"} className="px-3 py-1.5">{LABELS[s] ?? s}</Button>)}
        {pending && <span role="status" className="self-center text-xs text-muted">Saving…</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

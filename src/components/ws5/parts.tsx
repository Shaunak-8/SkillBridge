import { Badge } from "@/components/ui";
import type { ApplicationStatus } from "@/lib/applications/status";

const TONES: Record<ApplicationStatus, "default" | "green" | "amber" | "purple" | "blue"> = { submitted: "blue", viewed: "purple", shortlisted: "amber", accepted: "green", declined: "default", withdrawn: "default" };
export const ApplicationStatusBadge = ({ status }: { status: ApplicationStatus }) => <Badge tone={TONES[status]} className="capitalize">{status}</Badge>;

/** "Why this match?" - bullet reasons built from real profile/project fields. */
export function WhyMatch({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-brand">Why this match?</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{reasons.map((r) => <li key={r}>{r}</li>)}</ul></details>;
}

export const EmptyState = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center text-sm text-muted">{children}</div>;
export const DbError = () => <div role="alert" className="rounded-2xl border border-line bg-white py-14 text-center text-sm text-muted">We could not load this right now. Please try again shortly.</div>;

"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ApplyForm({ projectId }: { projectId: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover_note: note }) });
      const data = await res.json().catch(() => null);
      if (res.ok) setMsg({ ok: true, text: "Application sent. The business will review it and decide." });
      else setMsg({ ok: false, text: res.status === 409 ? data?.error?.startsWith("You have already") ? "You have already applied to this project." : data?.error ?? "Conflict." : data?.error ?? "Could not send application." });
    } catch { setMsg({ ok: false, text: "Network error. Try again." }); }
    setBusy(false);
  }
  if (msg?.ok) return <p role="status" className="rounded-xl bg-mint p-3 text-sm font-semibold text-emerald-700">{msg.text}</p>;
  return <form onSubmit={submit}>
    <label htmlFor="cover_note" className="text-sm font-semibold">Cover note</label>
    <textarea id="cover_note" required minLength={1} maxLength={2000} rows={6} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you a good fit? Mention relevant skills or work." className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
    <p className="mt-1 text-right text-xs text-muted" aria-live="polite">{note.length}/2000</p>
    {msg && <p role="alert" className="mb-2 text-sm text-red-600">{msg.text}</p>}
    <Button type="submit" disabled={busy || !note.trim()} className="w-full">{busy ? "Sending..." : "Apply for this project"}</Button>
  </form>;
}

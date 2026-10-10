"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useLanguage } from "@/lib/i18n/context";

export function ApplyForm({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover_note: note }) });
      const data = await res.json().catch(() => null);
      if (res.ok) setMsg({ ok: true, text: t('application_sent_success') });
      else setMsg({ ok: false, text: res.status === 409 ? data?.error?.startsWith("You have already") ? t('already_applied') : data?.error ?? "Conflict." : data?.error ?? "Could not send application." });
    } catch { setMsg({ ok: false, text: "Network error. Try again." }); }
    setBusy(false);
  }
  if (msg?.ok) {
    return (
      <p role="status" className="rounded-xl border-2 border-[#111111] bg-[#dbf5ed] p-4 text-sm font-bold text-emerald-800 shadow-[3px_3px_0_#111111]">
        {msg.text}
      </p>
    );
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor="cover_note" className="text-xs font-black uppercase tracking-wider text-[#151515]">
        {t('cover_note')}
      </label>
      <textarea
        id="cover_note"
        required
        minLength={1}
        maxLength={2000}
        rows={6}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('cover_note_placeholder')}
        className="mt-2 w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-sm font-medium text-[#151515] outline-none shadow-[2px_2px_0_#111111] placeholder:text-[#655F52]/60 focus:bg-[#F7F0D2]/20 focus:shadow-[3px_3px_0_#111111] transition"
      />
      <p className="mt-1 text-right text-xs font-bold text-[#655F52]" aria-live="polite">
        {note.length}/2000
      </p>
      {msg && <p role="alert" className="mb-2 text-xs font-bold text-[#D83D63]">{msg.text}</p>}
      <Button type="submit" disabled={busy || !note.trim()} className="w-full">
        {busy ? t('sending') : t('apply_for_project_btn')}
      </Button>
    </form>
  );
}

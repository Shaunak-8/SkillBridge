import type { ReactNode } from 'react';
export const controlClass = 'min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10';
export function FormField({ name, label, error, children, hint }: { name: string; label: string; error?: string; children: ReactNode; hint?: string }) {
  return <div className="space-y-2"><label htmlFor={name} className="block text-sm font-semibold">{label}</label>{hint && <p id={`${name}-hint`} className="text-sm text-muted">{hint}</p>}{children}{error && <p id={`${name}-error`} className="text-sm text-red-700">{error}</p>}</div>;
}

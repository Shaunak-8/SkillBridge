import type { ReactNode } from 'react';

export const controlClass =
  'min-h-11 w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-sm font-medium text-[#151515] outline-none shadow-[2px_2px_0_#111111] placeholder:text-[#655F52]/60 focus:bg-[#F7F0D2]/20 focus:shadow-[3px_3px_0_#111111] transition disabled:bg-gray-100 disabled:opacity-60';

export function FormField({
  name,
  label,
  error,
  children,
  hint,
}: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-black uppercase tracking-wider text-[#151515]">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-[#655F52]">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${name}-error`} className="text-xs font-bold text-[#D83D63]">
          {error}
        </p>
      )}
    </div>
  );
}


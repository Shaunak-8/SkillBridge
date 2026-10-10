import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

// 16px text on inputs stops iOS from zooming; min-h-11 is a 44px tap target.
export const fieldCls = 'block w-full min-h-11 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-base text-[#151515] outline-none focus:shadow-[3px_3px_0_#111111]';
export const labelCls = 'mb-1 block text-sm font-bold text-[#151515]';
export const mutedCls = 'text-sm leading-6 text-[#655F52]';
export const btnCls = 'min-h-11 w-full px-4 text-sm sm:w-auto';

export const AI_NOTE = 'AI-suggested answer — please check it';

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: React.ReactNode }) {
  return <p role={tone === 'error' ? 'alert' : 'status'} className={cn('mt-3 rounded-xl border-2 border-[#111111] px-3 py-2 text-sm font-medium', tone === 'error' ? 'bg-[#FCE8ED] text-[#9B1C3A]' : 'bg-[#FDFBF7] text-[#151515]')}>{children}</p>;
}

/** Inline confirm step (no browser dialogs): states plainly what happens, then asks. */
export function ConfirmBox({ title, children, confirmLabel, busy, onConfirm, onCancel, danger }: {
  title: string; children: React.ReactNode; confirmLabel: string; busy?: boolean; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={title} className="mt-4 rounded-xl border-2 border-[#111111] bg-[#FDFBF7] p-4 shadow-[3px_3px_0_#111111]">
      <h4 className="text-base font-black">{title}</h4>
      <div className="mt-2 text-sm leading-6">{children}</div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant={danger ? 'danger' : 'primary'} className={btnCls} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</Button>
        <Button type="button" variant="secondary" className={btnCls} disabled={busy} onClick={onCancel}>Not yet</Button>
      </div>
    </div>
  );
}

export const StatusChip = ({ children, tone }: { children: React.ReactNode; tone: 'default' | 'green' | 'amber' | 'blue' | 'pink' }) =>
  <Badge tone={tone} className="text-xs">{children}</Badge>;

import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accentColor = "gold",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accentColor?: "gold" | "pink" | "cream";
}) {
  const iconBg =
    accentColor === "pink"
      ? "bg-[#D83D63] text-white"
      : accentColor === "cream"
      ? "bg-[#F7F0D2] text-[#151515]"
      : "bg-[#F2BE4E] text-[#151515]";

  return (
    <div className="rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#655F52]">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#151515]">
            {value}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded border border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[11px] font-bold text-[#151515]">
            {detail}
          </div>
        </div>
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_#111111] ${iconBg}`}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

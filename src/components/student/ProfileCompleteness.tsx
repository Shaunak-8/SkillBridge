// src/components/student/ProfileCompleteness.tsx
// Profile completeness indicator and actionable suggestions
// Non-blocking, honest about student-reported status with NeoFlux styling

import React from "react";
import { CheckCircle2, Circle, HelpCircle, Sparkles } from "lucide-react";
import type { ProfileCompletenessResult } from "@/types/student";

interface ProfileCompletenessProps {
  completeness: ProfileCompletenessResult;
  onSelectSuggestion?: (suggestionId: string) => void;
}

export function ProfileCompleteness({ completeness }: ProfileCompletenessProps) {
  const { score, checklist } = completeness;
  const pendingItems = checklist.filter((item) => !item.completed);
  const completedItems = checklist.filter((item) => item.completed);

  return (
    <div className="rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg border-2 border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
            <Sparkles size={15} strokeWidth={2.5} />
          </span>
          <h3 className="font-black text-sm text-[#151515]">Profile Strength</h3>
        </div>
        <span className="rounded-md border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-0.5 text-xs font-black text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
          {score}% Complete
        </span>
      </div>

      {/* Progress Bar with Neo border and golden fill */}
      <div className="mt-3.5 h-3 w-full overflow-hidden rounded-md border-2 border-[#111111] bg-[#F7F0D2]">
        <div
          className="h-full bg-[#D83D63] transition-all duration-500 ease-out border-r border-[#111111]"
          style={{ width: `${Math.max(score, 5)}%` }}
        />
      </div>

      {/* Suggestion list */}
      <div className="mt-4 space-y-2.5">
        <p className="text-[11px] font-black uppercase tracking-wider text-[#655F52]">
          {pendingItems.length === 0 ? "All suggestions completed!" : "Helpful Suggestions"}
        </p>

        {pendingItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 rounded-lg border-2 border-[#111111] bg-[#F7F0D2] p-2.5 text-xs leading-relaxed text-[#151515] shadow-[2px_2px_0_#111111] transition hover:bg-white"
          >
            <Circle size={14} className="mt-0.5 shrink-0 text-[#D83D63]" strokeWidth={2.5} />
            <div>
              <p className="font-bold">{item.label}</p>
              <p className="text-[#655F52] mt-0.5 text-[11px]">{item.suggestion}</p>
            </div>
          </div>
        ))}

        {completedItems.length > 0 && pendingItems.length < checklist.length && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-bold text-[#655F52] hover:text-[#151515]">
              View {completedItems.length} completed items
            </summary>
            <div className="mt-2 space-y-1.5 pl-1">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-[#655F52]">
                  <CheckCircle2 size={13} className="text-[#137333]" strokeWidth={2.5} />
                  <span className="font-medium text-[11px]">{item.label}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Honest disclaimer notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border-2 border-dashed border-[#111111]/30 bg-[#F7F0D2]/70 p-2.5 text-[11px] leading-relaxed text-[#655F52]">
        <HelpCircle size={14} className="mt-0.5 shrink-0 text-[#655F52]" />
        <p>
          <strong className="text-[#151515]">Self-reported profile:</strong> Information is entered by the student. Profile completeness does not block browsing or applying to projects.
        </p>
      </div>
    </div>
  );
}

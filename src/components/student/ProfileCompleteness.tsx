// src/components/student/ProfileCompleteness.tsx
// Profile completeness indicator and actionable suggestions
// Non-blocking, honest about student-reported status

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
    <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-5 shadow-brutal transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-saffron/15 text-saffron-dark">
            <Sparkles size={16} />
          </span>
          <h3 className="font-bold text-ink">Profile Strength</h3>
        </div>
        <span className="rounded-md border border-charcoal/20 bg-warmCanvas px-2.5 py-0.5 text-xs font-bold text-charcoal">
          {score}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-charcoal/15 bg-canvas">
        <div
          className="h-full rounded-full bg-saffron transition-all duration-500 ease-out"
          style={{ width: `${Math.max(score, 5)}%` }}
        />
      </div>

      {/* Suggestion list */}
      <div className="mt-4 space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          {pendingItems.length === 0 ? "All suggestions completed!" : "Helpful Suggestions"}
        </p>

        {pendingItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 rounded-xl border border-charcoal/10 bg-warmCanvas p-2.5 text-xs leading-relaxed text-ink transition hover:border-saffron/40"
          >
            <Circle size={14} className="mt-0.5 shrink-0 text-saffron-dark" />
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="text-muted mt-0.5">{item.suggestion}</p>
            </div>
          </div>
        ))}

        {completedItems.length > 0 && pendingItems.length < checklist.length && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-semibold text-muted hover:text-ink">
              View {completedItems.length} completed items
            </summary>
            <div className="mt-2 space-y-1.5 pl-1">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={13} className="text-sage" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Honest disclaimer notice */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-charcoal/20 bg-canvas/70 p-2.5 text-[11px] leading-relaxed text-muted">
        <HelpCircle size={14} className="mt-0.5 shrink-0 text-muted" />
        <p>
          <strong>Self-reported profile:</strong> Information is entered by the student. Profile completeness does not block browsing or applying to projects.
        </p>
      </div>
    </div>
  );
}

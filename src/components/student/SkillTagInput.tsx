// src/components/student/SkillTagInput.tsx
// Interactive, accessible tag input for skills, interests, and learning goals with NeoFlux styling

import React, { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { normalizeTagList } from "@/lib/validation/student";

interface SkillTagInputProps {
  label: string;
  placeholder?: string;
  helperText?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
  tone?: "saffron" | "terracotta" | "sage" | "neutral" | "pink" | "gold";
  readOnly?: boolean;
}

export function SkillTagInput({
  label,
  placeholder = "Type and press Enter...",
  helperText,
  tags,
  onChange,
  maxTags = 20,
  maxTagLength = 35,
  tone = "gold",
  readOnly = false,
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toneClasses = {
    saffron: "bg-[#F2BE4E] text-[#151515]",
    gold: "bg-[#F2BE4E] text-[#151515]",
    terracotta: "bg-[#D83D63] text-white",
    pink: "bg-[#D83D63] text-white",
    sage: "bg-[#E6F4EA] text-[#137333]",
    neutral: "bg-[#F7F0D2] text-[#151515]",
  }[tone] || "bg-[#F2BE4E] text-[#151515]";

  const handleAddTag = (raw: string) => {
    setErrorMsg(null);
    const cleaned = raw.trim().replace(/\s+/g, " ");
    if (!cleaned) return;

    if (cleaned.length > maxTagLength) {
      setErrorMsg(`Maximum length is ${maxTagLength} characters.`);
      return;
    }

    if (tags.length >= maxTags) {
      setErrorMsg(`You can add up to ${maxTags} tags.`);
      return;
    }

    // Check duplicate case-insensitively
    const exists = tags.some((t) => t.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setErrorMsg(`"${cleaned}" has already been added.`);
      return;
    }

    const { valid } = normalizeTagList([...tags, cleaned], maxTags, maxTagLength);
    onChange(valid);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      e.preventDefault();
      handleRemoveTag(tags.length - 1);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setErrorMsg(null);
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#151515]">
          {label}
        </label>
        <span className="text-[11px] font-bold text-[#655F52]">
          {tags.length}/{maxTags}
        </span>
      </div>

      {helperText && (
        <p className="text-xs font-medium text-[#655F52] leading-relaxed">
          {helperText}
        </p>
      )}

      {/* Tag container */}
      <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-xl border-2 border-[#111111] bg-white p-2.5 shadow-[2px_2px_0_#111111] transition-all focus-within:shadow-[4px_4px_0_#111111]">
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className={`inline-flex items-center gap-1.5 rounded-md border-2 border-[#111111] px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_#111111] ${toneClasses} transition-all`}
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                aria-label={`Remove ${tag}`}
                className="rounded p-0.5 hover:bg-black/15 focus:outline-none"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </span>
        ))}

        {!readOnly && tags.length < maxTags && (
          <div className="flex flex-1 min-w-[140px] items-center gap-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (inputValue.trim()) {
                  handleAddTag(inputValue);
                }
              }}
              placeholder={tags.length === 0 ? placeholder : "Add another..."}
              maxLength={maxTagLength}
              className="w-full bg-transparent px-2 py-1 text-xs font-semibold text-[#151515] placeholder:text-[#655F52]/60 outline-none"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="rounded-md border-2 border-[#111111] bg-[#F2BE4E] p-1 text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#E0AC3C]"
                title="Add tag"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs font-bold text-[#D83D63]">{errorMsg}</p>
      )}
    </div>
  );
}

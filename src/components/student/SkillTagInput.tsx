// src/components/student/SkillTagInput.tsx
// Interactive, accessible tag input for skills, interests, and learning goals

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
  tone?: "saffron" | "terracotta" | "sage" | "neutral";
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
  tone = "saffron",
  readOnly = false,
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toneClasses = {
    saffron: "bg-saffron/10 border-saffron/30 text-saffron-dark hover:border-saffron",
    terracotta: "bg-terracotta/10 border-terracotta/30 text-terracotta-dark hover:border-terracotta",
    sage: "bg-sage/10 border-sage/30 text-sage-dark hover:border-sage",
    neutral: "bg-canvas border-charcoal/20 text-ink hover:border-charcoal/40",
  }[tone];

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
      // Remove last tag on empty backspace
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
        <label className="text-sm font-bold text-ink">{label}</label>
        <span className="text-xs text-muted">
          {tags.length}/{maxTags}
        </span>
      </div>

      {helperText && <p className="text-xs text-muted leading-relaxed">{helperText}</p>}

      {/* Tag list */}
      <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border-1.5 border-charcoal/20 bg-white p-2 shadow-sm transition focus-within:border-charcoal focus-within:ring-2 focus-within:ring-charcoal/10">
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${toneClasses} transition`}
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                aria-label={`Remove ${tag}`}
                className="rounded p-0.5 hover:bg-black/10 focus:outline-none"
              >
                <X size={13} />
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
              className="w-full bg-transparent px-2 py-1 text-xs text-ink placeholder:text-muted/60 outline-none"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="rounded-md border border-charcoal/20 bg-warmCanvas p-1 text-charcoal hover:bg-saffron/20"
                title="Add tag"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && <p className="text-xs font-medium text-terracotta">{errorMsg}</p>}
    </div>
  );
}
